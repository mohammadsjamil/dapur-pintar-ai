/**
 * Serverless Backend Proxy untuk Vercel (CommonJS Native)
 * Path: api/generate-recipe.js
 * Fitur: Multi-Model Fallback + Exponential Backoff Retry + Nilai Gizi
 */

module.exports = async function handler(req, res) {
    // 1. Handling CORS Preflight & Method Check
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metode tidak diizinkan. Gunakan POST.' });
    }

    // 2. Ambil Kunci API dari Environment Variable Vercel
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ 
            error: 'GEMINI_API_KEY tidak ditemukan di Vercel Settings -> Environment Variables.' 
        });
    }

    // 3. Parsing Request Body
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

    // 4. Susun System & User Prompt dengan Skema Nilai Gizi
    const systemPrompt = `Anda adalah koki profesional Nusantara, Pastry Chef, dan Ahli Gizi Kuliner. Tugas Anda adalah meracik 3 ide resep masakan, cake, pastry, atau dessert berkualitas tinggi berbasis bahan yang tersedia, lengkap dengan estimasi nilai gizi per porsi.`;

    const userPrompt = `
Bahan tersedia: ${ingredients.join(', ')}
Kategori Target Olahan: ${targetType || 'masakan'} (Pilihan: masakan, pastry, dessert, snack)
Peralatan tersedia: ${equipment || 'lengkap'}
Tingkat kesulitan: ${level || 'pemula'}

SANGAT PENTING: Berikan balasan HANYA berupa array JSON valid berisi 3 resep tanpa teks pembuka/penutup atau pemformatan markdown tambahan.
Format skema JSON:
[
  {
    "title": "Nama Masakan/Pastry",
    "description": "Deskripsi singkat cita rasa hidangan",
    "timeMinutes": 25,
    "calories": 320,
    "difficulty": "Pemula",
    "nutrition": {
      "proteinGrams": 25,
      "carbsGrams": 30,
      "fatGrams": 10,
      "fiberGrams": 4
    },
    "ingredientsUsed": ["bahan1", "bahan2"],
    "missingIngredients": ["bumbu/bahan tambahan jika ada"],
    "substitutions": "Informasi pengganti bahan jika ada yang kurang",
    "steps": ["Langkah 1...", "Langkah 2..."]
  }
]
`;

    // 5. Daftar endpoint & skema payload yang kompatibel secara lintas versi
    const endpointsToTry = [
        {
            url: `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            payload: {
                contents: [{ parts: [{ text: userPrompt }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
            }
        },
        {
            url: `https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
            payload: {
                contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
            }
        },
        {
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            payload: {
                contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
            }
        },
        {
            url: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            payload: {
                contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
            }
        }
    ];

    let errorLogs = [];

    // 6. Percobaan Endpoint + Exponential Backoff Retry (Max 5 kali per endpoint untuk error sementara)
    for (const item of endpointsToTry) {
        let delay = 1000; // Penundaan awal 1 detik

        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                const apiRes = await fetch(item.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item.payload)
                });

                if (apiRes.ok) {
                    const data = await apiRes.json();
                    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (rawText) {
                        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                        const parsedJson = JSON.parse(cleanedText);
                        return res.status(200).json(parsedJson);
                    }
                }

                const errText = await apiRes.text();
                
                // Jika error 404 (model/endpoint tidak ada), langsung lompat ke model berikutnya tanpa retry
                if (apiRes.status === 404) {
                    errorLogs.push(`404 NOT_FOUND [${item.url.split('/models/')[1]?.split(':')[0]}]`);
                    break;
                }

                // Jika error 429 atau 5xx, lakukan retry dengan backoff
                errorLogs.push(`HTTP ${apiRes.status} Attempt ${attempt + 1}: ${errText}`);
            } catch (err) {
                errorLogs.push(`Attempt ${attempt + 1} Exception: ${err.message}`);
            }

            // Exponential backoff delay (1s, 2s, 4s, 8s, 16s)
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }

    // Jika seluruh percobaan gagal, berikan respon terstruktur
    return res.status(500).json({ 
        error: `Gagal memanggil Gemini API dari semua endpoint. Jejak Log: ${errorLogs.join(' | ')}` 
    });
};            lastErrorDetail = err.message;
        }
    }

    return res.status(500).json({ 
        error: `Gagal memanggil Gemini API. Respon error: ${lastErrorDetail}` 
    });
};
