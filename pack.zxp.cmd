TITLE TypeR Pack

set /p version=Version: 
SET name=TypeR-%version%
SET tmpDir=tmpPackDir
SET sert=selfDB.p12
SET pass=12345

del %sert%
del %name%.zxp
rmdir %tmpDir% /S/Q

xcopy app %tmpDir%\app\ /E/Y/C
xcopy CSXS %tmpDir%\CSXS\ /E/Y/C
xcopy icons %tmpDir%\icons\ /E/Y/C
xcopy locale %tmpDir%\locale\ /E/Y/C
xcopy themes %tmpDir%\app\themes\ /E/Y/C

ZXPSignCmd -selfSignedCert US NY TypeR "Arcanos AL3mla8" %pass% %sert%
ZXPSignCmd -sign %tmpDir% %name%.zxp %sert% %pass% -tsa http://timestamp.digicert.com/

rmdir %tmpDir% /S/Q
del %sert%
del .rnd

PAUSE