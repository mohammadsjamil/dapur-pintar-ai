/**
 * Serverless Backend Proxy for DapurPintar AI
 * Endpoint: POST /api/generate-recipe
 */

export default async function handler(req, res) {
    // 1. Batasi hanya menerima metode POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metode tidak diizinkan. Gunakan POST.' });
    }

    // 2. Ambil Gemini API Key secara aman dari variabel lingkungan server
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ 
            error: 'Server Misconfiguration: GEMINI_API_KEY tidak ditemukan di Environment Variable server.' 
        });
    }

    // 3. Validasi input payload
    const { ingredients, timePref, stylePref } = req.body || {};

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: 'Harap kirimkan daftar bahan makanan minimal 1 item.' });
    }

    const systemPrompt = `Anda adalah koki profesional Nusantara. Tugas Anda adalah meracik 3 ide resep masakan berbasis bahan kulkas pengguna dalam Bahasa Indonesia.`;

    const userPrompt = `
    Bahan kulkas tersedia: ${ingredients.join(', ')}.
    Durasi memasak: ${timePref || 'sedang'}.
    Gaya hidangan: ${stylePref || 'rumahan'}.

    Format jawaban HARUS dalam bentuk JSON array valid berisi 3 objek seperti contoh berikut:
    [
      {
        "title": "Nama Masakan",
        "description": "Deskripsi singkat cita rasa masakan",
        "timeMinutes": 20,
        "calories": 350,
        "difficulty": "Mudah",
        "ingredientsUsed": ["bahan1", "bahan2"],
        "missingIngredients": ["bumbu tambahan jika ada"],
        "steps": ["Langkah 1...", "Langkah 2..."]
      }
    ]
    `;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    // 4. Mekanisme Exponential Backoff Retry untuk memanggil Gemini API
    let delay = 1000;
    let success = false;
    let responseData = null;

    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const apiRes = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!apiRes.ok) {
                throw new Error(`Gemini API HTTP Status ${apiRes.status}`);
            }

            const data = await apiRes.json();
            const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (textContent) {
                responseData = JSON.parse(textContent);
                success = true;
                break;
            }
        } catch (err) {
            if (attempt === 4) {
                console.error("Proxy Error Gemini Fetch:", err);
                return res.status(502).json({ error: 'Gagal terhubung ke AI Service setelah beberapa kali percobaan.' });
            }
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
        }
    }

    // 5. Kembalikan data resep berformat JSON ke frontend
    if (success && responseData) {
        // Keamanan Tambahan: Cache header 1 jam agar hemat kuota API
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        return res.status(200).json(responseData);
    } else {
        return res.status(500).json({ error: 'Format keluaran dari AI tidak valid.' });
    }
}

  
