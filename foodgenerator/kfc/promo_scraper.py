import os
import requests
import json

BASE_DIR = os.path.dirname(__file__)
TEMPLATE_FILE = os.path.join(BASE_DIR, "index.template.html")
OUTPUT_FILE = os.path.join(BASE_DIR, "index.html")

def fetch_promos():
    url = "https://api.kfc.co.nz/menu/kfc-nz-generic?v=LNNqPL"
    headers = {"User-Agent": "Mozilla/5.0"}
    r = requests.get(url, headers=headers)
    data = r.json()

    # Search JSON for promo/coupon section
    results = []

    for item in data.get("items", []):
        if "promotion" in item.get("tags", []):
            title = item.get("name", "No title")
            desc = item.get("description", "No description")
            results.append(f"""
            <div class="col-md-4">
              <div class="card border-success">
                <div class="card-body">
                  <h5 class="card-title">{title}</h5>
                  <p class="card-text">{desc}</p>
                </div>
              </div>
            </div>""")

    return "\n".join(results)

def update_html():
    with open(TEMPLATE_FILE, "r") as f:
        template = f.read()

    promos_html = fetch_promos()
    output = template.replace("{{PROMO_LIST}}", promos_html)

    with open(OUTPUT_FILE, "w") as f:
        f.write(output)

update_html()
