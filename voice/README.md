# Voz de referencia

`locutor-ar.wav` + `locutor-ar.txt`: voz **sintética** (español rioplatense, masculina, cálida). La diseñó el modelo
Qwen3-TTS VoiceDesign a partir de una descripción escrita y después se regeneró con el modelo Base sobre la frase
neutra de `locutor-ar.txt`. No es la voz de ninguna persona real.

`scripts/build.py` clona este timbre para cada frase del guion (por eso todas las escenas suenan igual).

Para usar otra voz: poné `voice/<nombre>.wav` (10–20 s, limpia) + `voice/<nombre>.txt` (lo que dice, exacto) y corré
`build.py ... --voice <nombre>`. Para diseñar una nueva desde una descripción:
`python scripts/tts_qwen.py design work/voz-nueva "Voz femenina adulta, español rioplatense, cálida y clara"`
(necesita el modelo VoiceDesign, otros ~4 GB).

**Nunca uses la grabación de una persona real sin su consentimiento explícito y por escrito.**
