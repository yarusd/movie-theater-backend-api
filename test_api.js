require('dotenv').config();

async function runTests() {
    console.log("🎬 Starting MovieTime REST API Auto-Tests...\n");
    const BASE_URL = "http://localhost:3001/api";
    let passed = 0; let failed = 0;

    // פונקציית עזר להדפסת תוצאות
    const assert = (condition, testName) => {
        if (condition) { 
            console.log(`✅ PASS: ${testName}`); 
            passed++; 
        } else { 
            console.error(`❌ FAIL: ${testName}`); 
            failed++; 
        }
    };

    try {
        // 1. בדיקה כללית - שליפת סרטים
        let res = await fetch(`${BASE_URL}/movies`);
        let data = await res.json();
        assert(res.ok && data.length > 0, "Fetch Movies Endpoint Returns Data");

        // 2. בדיקת התחברות (Login)
        res = await fetch(`${BASE_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "user1@test.com", password: "123456" })
        });
        data = await res.json();
        assert(res.ok && data.id === 1, "User Login Successfully");

        // 3. בדיקת יצירת סרט חדש
        const newMovie = { title: "Automation Test Movie", genre: "Action", rating: 5 };
        res = await fetch(`${BASE_URL}/movies`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "x-api-key": process.env.API_KEY || "my-temp-key"
            },
            body: JSON.stringify(newMovie)
        });
        assert(res.status === 201, "Create New Movie Successfully");

        // 4. בדיקת סינון UserId "נקי" (הפיצ'ר החדש)
        res = await fetch(`${BASE_URL}/movies?userId=1`);
        if (!res.ok) throw new Error("UserId Filter request failed");
        data = await res.json();
        
        // בדיקה שכל הדירוגים בתוצאה שייכים רק ליוזר 1
        const isClean = data.every(m => m.userRatings.every(r => r.userId === 1));
        assert(isClean, "Clean UserId Filter Logic Works");

        // 5. בדיקת איפוס (Reset)
        res = await fetch(`${BASE_URL}/test/reset`, { method: "POST" });
        assert(res.ok, "Database Reset Successfully");

    } catch (err) {
        console.error("\n❌ Test execution failed due to an error:");
        console.error(err.message);
    } finally {
        console.log(`\n📊 Test Summary: ${passed} Passed, ${failed} Failed`);
        
        // פשוט מגדירים את קוד היציאה ונותנים ל-Node להסגר בטבעיות
        process.exitCode = failed > 0 ? 1 : 0;
    }
}

runTests();