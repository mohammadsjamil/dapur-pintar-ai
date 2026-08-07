/**
 * Serverless Backend Proxy untuk Vercel (Universal Gemini API)
 * Path: api/generate-recipe.js
 */

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metode tidak diizinkan. Gunakan POST.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ 
            error: 'GEMINI_API_KEY tidak ditemukan di Vercel Settings -> Environment Variables.' 
        });
    }

    let bodyData = req.body;
    if (typeof bodyData === 'string') {
        try {
            bodyData = JSON.parse(bodyData);
        } catch (e) {
            bodyData = {};
        }
    }

    const { ingredients, targetType, equipment, level } = bodyData || {};

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: 'Harap sertakan minimal 1 bahan makanan.' });
    }

    const promptText = `
Anda adalah koki profesional Nusantara & Pastry Chef ahli.
Tugas Anda: Buatkan 3 ide resep masakan atau kue berbasis bahan yang tersedia berikut:

Bahan tersedia: ${ingredients.join(', ')}
Kategori Target Olahan: ${targetType || 'masakan'} (Pilihan: masakan, pastry, dessert, snack)
Peralatan tersedia: ${equipment || 'lengkap'}
Tingkat kesulitan: ${level || 'pemula'}

SANGAT PENTING: Berikan balasan HANYA berupa objek JSON array valid berisi 3 resep tanpa teks pembuka/penutup atau tag markdown tambahan.
Format skema JSON:
[
  {
    "title": "Nama Masakan/Pastry",
    "description": "Deskripsi singkat cita rasa",
    "timeMinutes": 25,
    "calories": 310,
    "difficulty": "Pemula",
    "ingredientsUsed": ["bahan1", "bahan2"],
    "missingIngredients": ["bumbu/bahan tambahan"],
    "substitutions": "Informasi pengganti bahan jika ada yang kurang",
    "steps": ["Langkah 1...", "Langkah 2..."]
  }
]
`;

    // Urutan endpoint resmi Google AI yang didukung secara universal
    const endpointsToTry = [
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    ];

    const payload = {
        contents: [
            {
                parts: [{ text: promptText }]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json"
        }
    };

    let lastErrorDetail = "";

    for (const endpoint of endpointsToTry) {
        try {
            const apiRes = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (apiRes.ok) {
                const data = await apiRes.json();
                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (rawText) {
                    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsedJson = JSON.parse(cleanedText);
                    return res.status(200).json(parsedJson);
                }
            } else {
                const errText = await apiRes.text();
                lastErrorDetail = `HTTP ${apiRes.status}: ${errText}`;
            }
        } catch (err) {
            lastErrorDetail = err.message;
        }
    }

    return res.status(500).json({ 
        error: `Gagal memanggil Gemini API. Respon error: ${lastErrorDetail}` 
    });
};
