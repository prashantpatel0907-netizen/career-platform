@echo off
echo.
echo === 1) GET jobs page=1^&limit=20 ===
curl -H "Authorization: Bearer %EMP_JWT%" "http://localhost:4000/api/jobs?page=1^&limit=20"
echo.
echo === 2) Create an Employer Owned Job ===
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer %EMP_JWT%" -d "{\"title\":\"Employer Owned Job\",\"description\":\"Owned by QuickCo\",\"companyId\":\"68c8f906ef5e872962c922a1\",\"companyName\":\"QuickCo\",\"country\":\"India\",\"city\":\"Remote\",\"salaryMin\":1000,\"salaryMax\":2000,\"salaryCurrency\":\"INR\",\"employmentType\":\"full-time\",\"isActive\":true}" http://localhost:4000/api/jobs
echo.
echo === 3) Apply as worker to job 68c9262507a14bc158b53e00 ===
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer %WORK_JWT%" -d "{\"jobId\":\"68c9262507a14bc158b53e00\",\"coverLetter\":\"Hi, I'm very interested in this job.\",\"expectedSalary\":\"30000\"}" http://localhost:4000/api/applications
echo.
echo === 4) Employer list applications for job 68c9262507a14bc158b53e00 ===
curl -H "Authorization: Bearer %EMP_JWT%" "http://localhost:4000/api/applications?jobId=68c9262507a14bc158b53e00"
echo.
echo === 5) Employer accept application 68c926a507a14bc158b53e02 ===
curl -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer %EMP_JWT%" -d "{\"action\":\"accept\",\"message\":\"We would like to interview you.\"}" http://localhost:4000/api/applications/68c926a507a14bc158b53e02
echo.
echo === 6) Employer reject application 68c926a507a14bc158b53e02 ===
curl -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer %EMP_JWT%" -d "{\"action\":\"reject\",\"message\":\"Thanks but not a fit right now.\"}" http://localhost:4000/api/applications/68c926a507a14bc158b53e02
echo.
echo === 7) Check worker notifications (should see accept/reject) ===
curl -H "Authorization: Bearer %WORK_JWT%" http://localhost:4000/api/notifications
echo.
echo === 8) Mark all worker notifications read ===
curl -X PUT -H "Authorization: Bearer %WORK_JWT%" http://localhost:4000/api/notifications/read-all
echo.
echo === 9) Simulate wallet top-up for employer (use correct simulate path) ===
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer %EMP_JWT%" -d "{\"amount\":2500,\"currency\":\"INR\"}" http://localhost:4000/api/payments/simulate/simulate
echo.
echo === 10) Check employer wallet & transactions ===
curl -H "Authorization: Bearer %EMP_JWT%" http://localhost:4000/api/wallet
echo.
echo === 11) Create Razorpay order (returns order id) ===
curl -X POST -H "Content-Type: application/json" -d "{\"amount\":1000,\"currency\":\"INR\",\"ownerId\":\"68c8f906ef5e872962c922a1\"}" http://localhost:4000/api/payments/razorpay/create-order
echo.
echo === 12) Create a temp job & list employer jobs (we won't patch/delete a hardcoded id here) ===
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer %EMP_JWT%" -d "{\"title\":\"Temp Job\",\"description\":\"Temp\",\"companyId\":\"68c8f906ef5e872962c922a1\",\"companyName\":\"QuickCo\"}" http://localhost:4000/api/jobs
curl -H "Authorization: Bearer %EMP_JWT%" "http://localhost:4000/api/employer/jobs?companyId=68c8f906ef5e872962c922a1"
echo.
echo === SMOKE CHECKS FINISHED ===
pause
