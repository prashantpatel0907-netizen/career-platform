@echo off
REM send_webhook.cmd usage: send_webhook.cmd dev-data\webhook.sim.json optional-secret optional-url
setlocal enabledelayedexpansion

set FILE=%~1
if "%FILE%"=="" set FILE=dev-data\webhook.sim.json

set SECRET=%~2
if "%SECRET%"=="" set SECRET=%RAZORPAY_WEBHOOK_SECRET%
if "%SECRET%"=="" set SECRET=Mom7Papa3Mood9Mast

set URL=%~3
if "%URL%"=="" set URL=http://localhost:4000/api/payments/razorpay/webhook

REM compute HMAC using node and capture into SIG
for /f "delims=" %%s in ('node -e "const fs=require(\"fs\"),crypto=require(\"crypto\"); const secret=process.env.RAZORPAY_WEBHOOK_SECRET||\"%SECRET%\"; const body=fs.readFileSync(\"%FILE%\"); console.log(crypto.createHmac(\"sha256\", secret).update(body).digest(\"hex\"));"') do set SIG=%%s

echo Signature=!SIG!
echo Posting %FILE% to %URL%
curl -v -X POST -H "Content-Type: application/json" -H "x-razorpay-signature: !SIG!" --data-binary @%FILE% %URL%

endlocal
