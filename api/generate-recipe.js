/**
 * Serverless Backend Proxy Vercel
 * Path: api/generate-recipe.js
 */

export default async function handler(req, res) {
    // Setel Header CORS & Content-Type
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metode tidak diizinkan. Gunakan POST.' });
    }

    try {
        // 1. Cek GEMINI_API_KEY
        const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';

        if (!apiKey) {
            return res.status(400).json({
                error: 'Variabel GEMINI_API_KEY belum terpasang di Vercel Settings -> Environment Variables. Pastikan Anda klik REDEPLOY setelah memasang key.'
            });
        }

        // 2. Parse Body Request
        let bodyData = req.body;
        if (typeof bodyData === 'string') {
            try {
                bodyData = JSON.parse(bodyData);
            } catch (e) {
                bodyData = {};
            }
        }
        bodyData = bodyData || {};

        const { ingredients = [], targetType = 'masakan', equipment = 'lengkap', level = 'pemula' } = bodyData;

        if (!Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({ error: 'Harap masukkan minimal 1 bahan makanan.' });
        }

        // 3. Prompt untuk Gemini 2.5 Flash
        const systemPrompt = `Anda adalah koki profesional Nusantara, Pastry Chef, dan Ahli Gizi Kuliner. Tugas Anda adalah meracik 3 ide resep masakan, cake, pastry, atau dessert berkualitas tinggi berbasis bahan yang tersedia, lengkap dengan estimasi nilai gizi per porsi dalam Bahasa Indonesia.`;

        const userPrompt = `Bahan tersedia: ${ingredients.join(', ')}.
Kategori Target Olahan: ${targetType}.
Peralatan tersedia: ${equipment}.
Tingkat kesulitan: ${level}.

SANGAT PENTING: Berikan balasan HANYA berupa array JSON valid berisi 3 resep tanpa teks pembuka/penutup atau pemformatan markdown.
Format skema JSON wajib:
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
]`;

        // 4. Request ke Endpoint Resmi Gemini 2.5 Flash
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                responseMimeType: "application/json"
            }
        };

        const apiRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const rawText = await apiRes.text();

        if (!apiRes.ok) {
            return res.status(apiRes.status).json({
                error: `Error dari Gemini API (${apiRes.status}): ${rawText}`
            });
        }

        let parsedData;
        try {
            parsedData = JSON.parse(rawText);
        } catch (e) {
            return res.status(500).json({ error: 'Respon dari Google Gemini bukan JSON valid.' });
        }

        const textContent = parsedData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
            return res.status(500).json({ error: 'Respon dari Gemini AI kosong.' });
        }

        const cleanedJson = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
        const recipes = JSON.parse(cleanedJson);

        return res.status(200).json(recipes);

    } catch (err) {
        return res.status(500).json({
            error: `Serverless Function Error: ${err.message}`
        });
    }
}
        const rawText = parsedApiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
            const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const finalRecipes = JSON.parse(cleanedText);
            return res.status(200).json(finalRecipes);
        } else {
            return res.status(500).json({ error: 'Hasil masakan dari AI kosong.' });
        }

    } catch (topErr) {
        return res.status(500).json({
            error: `Serverless Function Error: ${topErr.message || 'Terjadi kesalahan sistem internal.'}`
        });
    }
};                responseMimeType: "application/json"
            }
        };

        const apiRes = await fetch(generateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const rawApiText = await apiRes.text();

        if (!apiRes.ok) {
            return res.status(apiRes.status).json({
                error: `Error dari Gemini API (${apiRes.status}): ${rawApiText}`
            });
        }

        let parsedApiData;
        try {
            parsedApiData = JSON.parse(rawApiText);
        } catch (e) {
            return res.status(500).json({ error: 'Respon dari Google AI bukan JSON valid.' });
        }

        const rawText = parsedApiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
            const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const finalRecipes = JSON.parse(cleanedText);
            return res.status(200).json(finalRecipes);
        } else {
            return res.status(500).json({ error: 'Hasil masakan dari AI kosong.' });
        }

    } catch (topErr) {
        // Mencegah Vercel mengirimkan halaman HTML Error 500
        return res.status(500).json({
            error: `Serverless Function Error: ${topErr.message || 'Terjadi kesalahan sistem internal.'}`
        });
    }
};                { parts: [{ text: promptText }] }
            ],
            generationConfig: {
                temperature: 0.7,
                responseMimeType: "application/json"
            }
        };

        const apiRes = await fetch(generateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiRes.ok) {
            const errText = await apiRes.text();
            return res.status(apiRes.status).json({
                error: `Error saat memanggil model terdeteksi (${selectedModelPath}): ${errText}`
            });
        }

        const data = await apiRes.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
            const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedJson = JSON.parse(cleanedText);
            return res.status(200).json(parsedJson);
        } else {
            return res.status(500).json({ error: 'Respon dari AI kosong.' });
        }

    } catch (err) {
        return res.status(500).json({ error: `Serverless Proxy Exception: ${err.message}` });
    }
};
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
