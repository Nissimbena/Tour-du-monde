# Been-Style Travel Tracker (Web + Mobile)

MVP of a travel tracker inspired by `been.app`, optimized for mobile web and also usable on desktop.

## Current Features

- Country list with quick mark/unmark as visited
- Search by country name
- Filter by continent
- Progress stats (visited count and percentage)
- Local persistence with `localStorage`
- Responsive layout for mobile and desktop

## Notes

- Country dataset currently includes `Israel` and does not include `Palestine`, per your request.
- This is phase 1 (MVP). More features can be added next.

## GitHub Pages Setup (One-time)

To make the app live at `https://nissimbena.github.io/Tour-du-monde/`, you need to enable Pages in your repository:

1. Go to: **https://github.com/Nissimbena/Tour-du-monde/settings/pages**
2. Under **Build and deployment**:
	- **Source**: Select **GitHub Actions**  
	- Click **Save**
3. Wait 1–2 minutes for deployment. The app will then be live!

## Run Locally

Open `index.html` in your browser.

For a local server (recommended), from this folder run:

```powershell
python -m http.server 5500
```

Then open `http://localhost:5500`.
