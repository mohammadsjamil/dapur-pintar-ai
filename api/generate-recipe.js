/**
 * Serverless Backend Proxy untuk Vercel (CommonJS Native)
 * Path: api/generate-recipe.js
 * Model: gemini-1.5-flash (v1 API Endpoint)
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
            error: 'GEMINI_API_KEY tidak ditemukan di Vercel Environment Variables.' 
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

    const systemPrompt = `Anda adalah koki profesional Nusantara & Pastry Chef ahli. Tugas Anda adalah meracik 3 ide resep masakan/kue berbasis bahan kulkas pengguna dalam Bahasa Indonesia secara mendetail.`;

    const userPrompt = `
    Bahan tersedia: ${ingredients.join(', ')}.
    Kategori Target Olahan: ${targetType || 'masakan'}.
    Peralatan tersedia: ${equipment || 'lengkap'}.
    Tingkat kesulitan: ${level || 'pemula'}.

    Format jawaban HARUS berupa array JSON valid berisi 3 objek seperti skema ini:
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

    // Menggunakan endpoint v1 resmi (versi stabil produksi)
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    try {
        const apiRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiRes.ok) {
            const errBody = await apiRes.text();
            return res.status(apiRes.status).json({ 
                error: `Error dari Gemini API (${apiRes.status}): ${errBody}` 
            });
        }

        const data = await apiRes.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (textContent) {
            const parsedData = JSON.parse(textContent);
            return res.status(200).json(parsedData);
        } else {
            return res.status(500).json({ error: 'Respon dari AI kosong atau format tidak sesuai.' });
        }
    } catch (err) {
        return res.status(500).json({ error: `Serverless Proxy Exception: ${err.message}` });
    }
};
