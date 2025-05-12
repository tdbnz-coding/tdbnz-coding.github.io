import requests
from bs4 import BeautifulSoup

TEMPLATE_FILE = "index.template.html"
OUTPUT_FILE = "index.html"

def fetch_promos():
    url = "https://www.kfc.co.nz/coupons"
    headers = {'User-Agent': 'Mozilla/5.0'}
    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, "html.parser")

    promos = []
    for div in soup.find_all('div', class_='coupon-item'):
        title = div.find('h3')
        desc = div.find('p')
        if title and desc:
            promos.append(f"""
            <div class="col-md-4">
              <div class="card border-success">
                <div class="card-body">
                  <h5 class="card-title">{title.text.strip()}</h5>
                  <p class="card-text">{desc.text.strip()}</p>
                </div>
              </div>
            </div>""")
    return "\n".join(promos)

def update_html():
    with open(TEMPLATE_FILE, "r") as f:
        template = f.read()

    promos_html = fetch_promos()
    output = template.replace("{{PROMO_LIST}}", promos_html)

    with open(OUTPUT_FILE, "w") as f:
        f.write(output)

update_html()
