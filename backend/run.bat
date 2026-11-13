@echo off
chcp 65001 >nul
echo ====================================================
echo Starting Spring Boot Backend...
echo ====================================================
.\mvnw.cmd spring-boot:run -Dspring-boot.run.jvmArguments="-Dfile.encoding=UTF-8 -Dconsole.encoding=UTF-8 -Dstdout.encoding=UTF-8"
