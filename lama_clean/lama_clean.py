import sys
import os
import argparse
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F


def get_activation(kind='tanh'):
    if kind == 'tanh':
        return nn.Tanh()
    if kind == 'sigmoid':
        return nn.Sigmoid()
    if kind is False:
        return nn.Identity()
    raise ValueError(f'Unknown activation kind {kind}')


class FourierUnit(nn.Module):
    def __init__(self, in_channels, out_channels, groups=1, spatial_scale_factor=None, spatial_scale_mode='bilinear',
                 spectral_pos_encoding=False, use_se=False, se_kwargs=None, ffc3d=False, fft_norm='ortho'):
        super(FourierUnit, self).__init__()
        self.groups = groups
        self.conv_layer = nn.Conv2d(in_channels=in_channels * 2 + (2 if spectral_pos_encoding else 0),
                                    out_channels=out_channels * 2,
                                    kernel_size=1, stride=1, padding=0, groups=self.groups, bias=False)
        self.bn = nn.BatchNorm2d(out_channels * 2)
        self.relu = nn.ReLU(inplace=True)
        self.use_se = use_se
        self.spatial_scale_factor = spatial_scale_factor
        self.spatial_scale_mode = spatial_scale_mode
        self.spectral_pos_encoding = spectral_pos_encoding
        self.ffc3d = ffc3d
        self.fft_norm = fft_norm

    def forward(self, x):
        batch = x.shape[0]
        if self.spatial_scale_factor is not None:
            orig_size = x.shape[-2:]
            x = F.interpolate(x, scale_factor=self.spatial_scale_factor, mode=self.spatial_scale_mode, align_corners=False)
        r_size = x.size()
        fft_dim = (-3, -2, -1) if self.ffc3d else (-2, -1)
        ffted = torch.fft.rfftn(x, dim=fft_dim, norm=self.fft_norm)
        ffted = torch.stack((ffted.real, ffted.imag), dim=-1)
        ffted = ffted.permute(0, 1, 4, 2, 3).contiguous()
        ffted = ffted.view((batch, -1,) + ffted.size()[3:])
        if self.spectral_pos_encoding:
            height, width = ffted.shape[-2:]
            coords_vert = torch.linspace(0, 1, height)[None, None, :, None].expand(batch, 1, height, width).to(ffted)
            coords_hor = torch.linspace(0, 1, width)[None, None, None, :].expand(batch, 1, height, width).to(ffted)
            ffted = torch.cat((coords_vert, coords_hor, ffted), dim=1)
        ffted = self.conv_layer(ffted)
        ffted = self.relu(self.bn(ffted))
        ffted = ffted.view((batch, -1, 2,) + ffted.size()[2:]).permute(0, 1, 3, 4, 2).contiguous()
        ffted = torch.complex(ffted[..., 0], ffted[..., 1])
        ifft_shape_slice = x.shape[-3:] if self.ffc3d else x.shape[-2:]
        output = torch.fft.irfftn(ffted, s=ifft_shape_slice, dim=fft_dim, norm=self.fft_norm)
        if self.spatial_scale_factor is not None:
            output = F.interpolate(output, size=orig_size, mode=self.spatial_scale_mode, align_corners=False)
        return output


class SpectralTransform(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1, groups=1, enable_lfu=True, **fu_kwargs):
        super(SpectralTransform, self).__init__()
        self.enable_lfu = enable_lfu
        if stride == 2:
            self.downsample = nn.AvgPool2d(kernel_size=(2, 2), stride=2)
        else:
            self.downsample = nn.Identity()
        self.stride = stride
        self.conv1 = nn.Sequential(
            nn.Conv2d(in_channels, out_channels // 2, kernel_size=1, groups=groups, bias=False),
            nn.BatchNorm2d(out_channels // 2),
            nn.ReLU(inplace=True)
        )
        self.fu = FourierUnit(out_channels // 2, out_channels // 2, groups, **fu_kwargs)
        if self.enable_lfu:
            self.lfu = FourierUnit(out_channels // 2, out_channels // 2, groups)
        self.conv2 = nn.Conv2d(out_channels // 2, out_channels, kernel_size=1, groups=groups, bias=False)

    def forward(self, x):
        x = self.downsample(x)
        x = self.conv1(x)
        output = self.fu(x)
        if self.enable_lfu:
            n, c, h, w = x.shape
            split_no = 2
            split_s = h // split_no
            xs = torch.cat(torch.split(x[:, :c // 4], split_s, dim=-2), dim=1).contiguous()
            xs = torch.cat(torch.split(xs, split_s, dim=-1), dim=1).contiguous()
            xs = self.lfu(xs)
            xs = xs.repeat(1, 1, split_no, split_no).contiguous()
        else:
            xs = 0
        output = self.conv2(x + output + xs)
        return output


class FFC(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size,
                 ratio_gin, ratio_gout, stride=1, padding=0,
                 dilation=1, groups=1, bias=False, enable_lfu=True,
                 padding_type='reflect', gated=False, **spectral_kwargs):
        super(FFC, self).__init__()
        assert stride == 1 or stride == 2
        self.stride = stride
        in_cg = int(in_channels * ratio_gin)
        in_cl = in_channels - in_cg
        out_cg = int(out_channels * ratio_gout)
        out_cl = out_channels - out_cg
        self.ratio_gin = ratio_gin
        self.ratio_gout = ratio_gout
        self.global_in_num = in_cg
        module = nn.Identity if in_cl == 0 or out_cl == 0 else nn.Conv2d
        self.convl2l = module(in_cl, out_cl, kernel_size, stride, padding, dilation, groups, bias, padding_mode=padding_type)
        module = nn.Identity if in_cl == 0 or out_cg == 0 else nn.Conv2d
        self.convl2g = module(in_cl, out_cg, kernel_size, stride, padding, dilation, groups, bias, padding_mode=padding_type)
        module = nn.Identity if in_cg == 0 or out_cl == 0 else nn.Conv2d
        self.convg2l = module(in_cg, out_cl, kernel_size, stride, padding, dilation, groups, bias, padding_mode=padding_type)
        module = nn.Identity if in_cg == 0 or out_cg == 0 else SpectralTransform
        self.convg2g = module(in_cg, out_cg, stride, 1 if groups == 1 else groups // 2, enable_lfu, **spectral_kwargs)
        self.gated = gated
        module = nn.Identity if in_cg == 0 or out_cl == 0 or not self.gated else nn.Conv2d
        self.gate = module(in_channels, 2, 1)

    def forward(self, x):
        x_l, x_g = x if type(x) is tuple else (x, 0)
        out_xl, out_xg = 0, 0
        if self.gated:
            total_input_parts = [x_l]
            if torch.is_tensor(x_g):
                total_input_parts.append(x_g)
            total_input = torch.cat(total_input_parts, dim=1)
            gates = torch.sigmoid(self.gate(total_input))
            g2l_gate, l2g_gate = gates.chunk(2, dim=1)
        else:
            g2l_gate, l2g_gate = 1, 1
        if self.ratio_gout != 1:
            out_xl = self.convl2l(x_l) + self.convg2l(x_g) * g2l_gate
        if self.ratio_gout != 0:
            out_xg = self.convl2g(x_l) * l2g_gate + self.convg2g(x_g)
        return out_xl, out_xg


class FFC_BN_ACT(nn.Module):
    def __init__(self, in_channels, out_channels,
                 kernel_size, ratio_gin, ratio_gout,
                 stride=1, padding=0, dilation=1, groups=1, bias=False,
                 norm_layer=nn.BatchNorm2d, activation_layer=nn.Identity,
                 padding_type='reflect', enable_lfu=True, **kwargs):
        super(FFC_BN_ACT, self).__init__()
        self.ffc = FFC(in_channels, out_channels, kernel_size,
                       ratio_gin, ratio_gout, stride, padding, dilation,
                       groups, bias, enable_lfu, padding_type=padding_type, **kwargs)
        lnorm = nn.Identity if ratio_gout == 1 else norm_layer
        gnorm = nn.Identity if ratio_gout == 0 else norm_layer
        global_channels = int(out_channels * ratio_gout)
        self.bn_l = lnorm(out_channels - global_channels)
        self.bn_g = gnorm(global_channels)
        lact = nn.Identity if ratio_gout == 1 else activation_layer
        gact = nn.Identity if ratio_gout == 0 else activation_layer
        self.act_l = lact(inplace=True)
        self.act_g = gact(inplace=True)

    def forward(self, x):
        x_l, x_g = self.ffc(x)
        x_l = self.act_l(self.bn_l(x_l))
        x_g = self.act_g(self.bn_g(x_g))
        return x_l, x_g


class FFCResnetBlock(nn.Module):
    def __init__(self, dim, padding_type, norm_layer, activation_layer=nn.ReLU, dilation=1,
                 spatial_transform_kwargs=None, inline=False, **conv_kwargs):
        super().__init__()
        self.conv1 = FFC_BN_ACT(dim, dim, kernel_size=3, padding=dilation, dilation=dilation,
                                norm_layer=norm_layer, activation_layer=activation_layer,
                                padding_type=padding_type, **conv_kwargs)
        self.conv2 = FFC_BN_ACT(dim, dim, kernel_size=3, padding=dilation, dilation=dilation,
                                norm_layer=norm_layer, activation_layer=activation_layer,
                                padding_type=padding_type, **conv_kwargs)
        self.inline = inline

    def forward(self, x):
        if self.inline:
            x_l, x_g = x[:, :-self.conv1.ffc.global_in_num], x[:, -self.conv1.ffc.global_in_num:]
        else:
            x_l, x_g = x if type(x) is tuple else (x, 0)
        id_l, id_g = x_l, x_g
        x_l, x_g = self.conv1((x_l, x_g))
        x_l, x_g = self.conv2((x_l, x_g))
        x_l, x_g = id_l + x_l, id_g + x_g
        out = x_l, x_g
        if self.inline:
            out = torch.cat(out, dim=1)
        return out


class ConcatTupleLayer(nn.Module):
    def forward(self, x):
        assert isinstance(x, tuple)
        x_l, x_g = x
        assert torch.is_tensor(x_l) or torch.is_tensor(x_g)
        if not torch.is_tensor(x_g):
            return x_l
        return torch.cat(x, dim=1)


class FFCResNetGenerator(nn.Module):
    def __init__(self, input_nc, output_nc, ngf=64, n_downsampling=3, n_blocks=9, norm_layer=nn.BatchNorm2d,
                 padding_type='reflect', activation_layer=nn.ReLU,
                 up_norm_layer=nn.BatchNorm2d, up_activation=nn.ReLU(True),
                 init_conv_kwargs={}, downsample_conv_kwargs={}, resnet_conv_kwargs={},
                 spatial_transform_layers=None, spatial_transform_kwargs={},
                 add_out_act=True, max_features=1024, out_ffc=False, out_ffc_kwargs={}):
        assert (n_blocks >= 0)
        super().__init__()
        model = [nn.ReflectionPad2d(3),
                 FFC_BN_ACT(input_nc, ngf, kernel_size=7, padding=0, norm_layer=norm_layer,
                            activation_layer=activation_layer, **init_conv_kwargs)]
        for i in range(n_downsampling):
            mult = 2 ** i
            if i == n_downsampling - 1:
                cur_conv_kwargs = dict(downsample_conv_kwargs)
                cur_conv_kwargs['ratio_gout'] = resnet_conv_kwargs.get('ratio_gin', 0)
            else:
                cur_conv_kwargs = downsample_conv_kwargs
            model += [FFC_BN_ACT(min(max_features, ngf * mult),
                                 min(max_features, ngf * mult * 2),
                                 kernel_size=3, stride=2, padding=1,
                                 norm_layer=norm_layer,
                                 activation_layer=activation_layer,
                                 **cur_conv_kwargs)]
        mult = 2 ** n_downsampling
        feats_num_bottleneck = min(max_features, ngf * mult)
        for i in range(n_blocks):
            cur_resblock = FFCResnetBlock(feats_num_bottleneck, padding_type=padding_type, activation_layer=activation_layer,
                                          norm_layer=norm_layer, **resnet_conv_kwargs)
            model += [cur_resblock]
        model += [ConcatTupleLayer()]
        for i in range(n_downsampling):
            mult = 2 ** (n_downsampling - i)
            model += [nn.ConvTranspose2d(min(max_features, ngf * mult),
                                         min(max_features, int(ngf * mult / 2)),
                                         kernel_size=3, stride=2, padding=1, output_padding=1),
                      up_norm_layer(min(max_features, int(ngf * mult / 2))),
                      up_activation]
        model += [nn.ReflectionPad2d(3),
                  nn.Conv2d(ngf, output_nc, kernel_size=7, padding=0)]
        if add_out_act:
            model.append(get_activation('tanh' if add_out_act is True else add_out_act))
        self.model = nn.Sequential(*model)

    def forward(self, input):
        return self.model(input)


def load_model(model_path, device):
    try:
        model = torch.jit.load(model_path, map_location=device)
        model.eval()
        return model, "jit"
    except Exception:
        pass

    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    generator = FFCResNetGenerator(
        input_nc=4, output_nc=3, ngf=64, n_downsampling=3, n_blocks=18,
        add_out_act='sigmoid',
        init_conv_kwargs={'ratio_gin': 0, 'ratio_gout': 0, 'enable_lfu': False},
        downsample_conv_kwargs={'ratio_gin': 0, 'ratio_gout': 0, 'enable_lfu': False},
        resnet_conv_kwargs={'ratio_gin': 0.75, 'ratio_gout': 0.75, 'enable_lfu': False},
    )
    if 'state_dict' in checkpoint:
        gen_sd = {k.replace('generator.', '', 1): v for k, v in checkpoint['state_dict'].items() if k.startswith('generator.')}
        if len(gen_sd) > 0:
            sd = gen_sd
        else:
            sd = checkpoint['state_dict']
    else:
        sd = checkpoint
    generator.load_state_dict(sd)
    generator.eval()
    generator.to(device)
    return generator, "checkpoint"


def run_inpainting(model, device, image_path, mask_path, output_path):
    img = Image.open(image_path).convert("RGB")
    mask = Image.open(mask_path).convert("L")
    orig_w, orig_h = img.size
    orig_img_np = np.array(img).astype(np.float32) / 255.0
    orig_mask_np = np.array(mask).astype(np.float32) / 255.0
    orig_mask_np = (orig_mask_np > 0.5).astype(np.float32)
    pad_to = 8
    new_h = ((orig_h + pad_to - 1) // pad_to) * pad_to
    new_w = ((orig_w + pad_to - 1) // pad_to) * pad_to
    needs_resize = new_w != orig_w or new_h != orig_h
    if needs_resize:
        img = img.resize((new_w, new_h), Image.LANCZOS)
        mask = mask.resize((new_w, new_h), Image.NEAREST)
    img_np = np.array(img).astype(np.float32) / 255.0
    mask_np = np.array(mask).astype(np.float32) / 255.0
    mask_np = (mask_np > 0.5).astype(np.float32)
    masked_img_np = img_np * (1.0 - np.expand_dims(mask_np, axis=2))
    img_tensor = torch.from_numpy(masked_img_np).permute(2, 0, 1).unsqueeze(0).to(device)
    mask_tensor = torch.from_numpy(mask_np).unsqueeze(0).unsqueeze(0).to(device)
    inp = torch.cat([img_tensor, mask_tensor], dim=1)
    with torch.no_grad():
        predicted = model(inp)
    predicted = predicted[0].permute(1, 2, 0).cpu().numpy()
    predicted = np.clip(predicted, 0, 1)
    if needs_resize:
        predicted_img = Image.fromarray((predicted * 255).astype(np.uint8))
        predicted_img = predicted_img.resize((orig_w, orig_h), Image.LANCZOS)
        predicted = np.array(predicted_img).astype(np.float32) / 255.0
    mask_3ch = np.expand_dims(orig_mask_np, axis=2)
    composited = mask_3ch * predicted + (1.0 - mask_3ch) * orig_img_np
    result_np = np.clip(composited * 255, 0, 255).astype(np.uint8)
    result_img = Image.fromarray(result_np)
    result_img.save(output_path, quality=95)
    print("OK:" + output_path)


def run_detection(det_model_path, image_path, conf_threshold=0.35):
    try:
        from ultralytics import YOLO
    except ImportError:
        print("ERROR:ultralytics_not_installed", file=sys.stderr)
        sys.exit(1)

    _orig_load = torch.load
    def _patched_load(*a, **kw):
        kw['weights_only'] = False
        return _orig_load(*a, **kw)
    torch.load = _patched_load
    try:
        model = YOLO(det_model_path)
    finally:
        torch.load = _orig_load
    results = model.predict(source=image_path, conf=conf_threshold, verbose=False)
    detections = []
    if results and len(results) > 0:
        r = results[0]
        if r.boxes is not None:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                cls_name = model.names[cls] if cls in model.names else str(cls)
                detections.append({
                    "x1": int(round(x1)), "y1": int(round(y1)),
                    "x2": int(round(x2)), "y2": int(round(y2)),
                    "confidence": round(conf, 3),
                    "class": cls_name
                })
    import json
    print(json.dumps(detections))


def main():
    parser = argparse.ArgumentParser(description="LaMa Inpainting CLI")
    subparsers = parser.add_subparsers(dest="command")

    clean_parser = subparsers.add_parser("clean", help="Run inpainting")
    clean_parser.add_argument("--model-dir", required=True)
    clean_parser.add_argument("--input", required=True)
    clean_parser.add_argument("--mask", required=True)
    clean_parser.add_argument("--output", required=True)

    detect_parser = subparsers.add_parser("detect", help="Detect text regions")
    detect_parser.add_argument("--det-model", required=True)
    detect_parser.add_argument("--input", required=True)
    detect_parser.add_argument("--conf", type=float, default=0.35)

    parser.add_argument("--model-dir")
    parser.add_argument("--input")
    parser.add_argument("--mask")
    parser.add_argument("--output")

    args = parser.parse_args()

    if args.command == "detect":
        if not os.path.exists(args.input):
            print("ERROR:input_not_found:" + args.input, file=sys.stderr)
            sys.exit(1)
        if not os.path.exists(args.det_model):
            print("ERROR:det_model_not_found:" + args.det_model, file=sys.stderr)
            sys.exit(1)
        run_detection(args.det_model, args.input, args.conf)
        return

    if args.command == "clean" or args.model_dir:
        model_dir = args.model_dir
        input_path = args.input
        mask_path = args.mask
        output_path = args.output

        if not model_dir or not input_path or not mask_path or not output_path:
            parser.print_help()
            sys.exit(1)

        if not os.path.exists(input_path):
            print("ERROR:input_not_found:" + input_path, file=sys.stderr)
            sys.exit(1)
        if not os.path.exists(mask_path):
            print("ERROR:mask_not_found:" + mask_path, file=sys.stderr)
            sys.exit(1)
        if not os.path.isdir(model_dir):
            print("ERROR:model_dir_not_found:" + model_dir, file=sys.stderr)
            sys.exit(1)

        model_path = None
        for fname in os.listdir(model_dir):
            if fname.endswith(".pt") or fname.endswith(".pth") or fname.endswith(".ckpt"):
                model_path = os.path.join(model_dir, fname)
                break
        if model_path is None:
            print("ERROR:model_not_found:" + model_dir, file=sys.stderr)
            sys.exit(1)

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model, kind = load_model(model_path, device)
        print(f"LOADED:{kind}:{model_path}", file=sys.stderr)
        run_inpainting(model, device, input_path, mask_path, output_path)
        return

    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
