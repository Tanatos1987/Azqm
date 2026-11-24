"""Generate the Azqm food-group photos (option В) with Qwen-Image (Apache-2.0) on a public Hugging Face Space.

Usage: python gen.py OUT_DIR KEY [KEY ...]   (keys from SUBJECTS; 'all' = every key)
Writes OUT_DIR/<key>.png plus OUT_DIR/prompts.txt (the exact prompt and seed per image).
"""
import shutil
import sys
import pathlib

from gradio_client import Client

SPACE = "mcp-tools/Qwen-Image-Fast"
SEED = 2411

SUBJECTS = {
    "meat": "a thick raw beef steak with fine marbling next to a raw chicken breast fillet and a small sprig of rosemary",
    "deli": "a small fan of thinly sliced salami and prosciutto with a few slices of smoked sausage",
    "fish": "a fresh raw salmon fillet with two thin lemon slices and a sprig of dill",
    "eggs": "four whole brown eggs and one halved hard-boiled egg showing a bright yellow yolk",
    "dairy": "a short glass of fresh milk next to a small ceramic bowl of thick white yogurt",
    "cheese": "a wedge of yellow cheese with small holes next to a block of white feta cheese",
    "fats": "a small glass bowl of golden olive oil next to a block of fresh butter",
    "vegetables": "fresh broccoli florets, a halved red bell pepper, cherry tomatoes and a cucumber",
    "fruits": "a red apple, a few ripe strawberries, a halved orange and a small bunch of grapes",
    "nuts": "a generous pile of mixed walnuts, almonds and hazelnuts",
    "legumes": "a small ceramic bowl of cooked white beans surrounded by dry lentils and chickpeas",
    "grains": "two slices of rustic sourdough bread, a small bowl of rolled oats and a scoop of white rice",
    "sweets": "squares of dark chocolate and two round butter cookies",
    "sauces": "three small ceramic dipping bowls with tomato sauce, a creamy garlic sauce and a green herb sauce",
    "drinks": "a white cup of black coffee next to a tall glass of orange juice",
    "alcohol": "a glass of red wine next to a glass of golden beer",
    "dishes": "a ceramic bowl of hearty bean and vegetable stew garnished with fresh parsley",
    "custom": "a glass meal-prep container with grilled chicken, rice and broccoli",
}


def prompt_for(subject: str) -> str:
    return (
        f"A photorealistic top-down close-up food photograph of {subject}. The food sits in the center and fills most "
        "of the square frame. Underneath, a matte dark navy stone surface covers the whole background from edge to "
        "edge. Soft diffused studio light from the upper left, gentle natural shadows, rich true-to-life colors, sharp "
        "focus. Professional commercial food photography with a calm, premium, minimal look. "
        "No text, no logos, no watermark."
    )


def main() -> None:
    out = pathlib.Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    keys = list(SUBJECTS) if sys.argv[2:] == ["all"] else sys.argv[2:]
    # the owner's Hugging Face read key (saved in the standard place), for the GPU quota
    token_file = pathlib.Path.home() / ".cache" / "huggingface" / "token"
    token = token_file.read_text(encoding="utf-8").strip() if token_file.exists() else None
    client = Client(SPACE, token=token, verbose=False)
    log = out / "prompts.txt"
    for key in keys:
        target = out / f"{key}.png"
        if target.exists():
            print(key, "exists")
            continue
        p = prompt_for(SUBJECTS[key])
        result = client.predict(prompt=p, seed=SEED, randomize_seed=False, aspect_ratio="1:1", api_name="/generate_image")
        path = result[0] if isinstance(result, (list, tuple)) else result
        if isinstance(path, dict):
            path = path.get("path") or path.get("url")
        shutil.copyfile(path, target)
        with log.open("a", encoding="utf-8") as f:
            f.write(f"{key}\tseed {SEED}\t{p}\n")
        print(key, "ok", target.stat().st_size)


if __name__ == "__main__":
    main()
