# Food-group photos (assets/food)

The owner's pick on 24.11.2026 (option В): one photo per food group, all in one style. Made with Qwen-Image
(Apache-2.0) on the public Hugging Face Space `mcp-tools/Qwen-Image-Fast`, seed 2411, one prompt template
(top-down, dark navy stone, soft light) — see `gen.py`.

    pip install --user gradio_client
    python gen.py <raw-dir> all                      # PNG 1024 px; skips groups already made
    python -I shrink.py <raw-dir> <out-dir> <preview.jpg> 0.74   # centre crop, 160 px WebP + a circle preview

`gen.py` reads a Hugging Face read key from `~/.cache/huggingface/token` (free accounts have a daily GPU quota).
Copy the WebP files to `assets/food/` and add each group to `FOOD_PHOTOS` in `src/data/foodPhotos.ts`.
