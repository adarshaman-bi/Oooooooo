# BioVised Project Vault 🗺️

Welcome to your BioVised project documentation vault for Obsidian! 

Obsidian turns folders of plain text Markdown files into a rich, interactive, connected knowledge base. Because these files contain internal links using the `[[Note Name]]` format, Obsidian automatically constructs a visual **Graph View** showing how all files, components, and concepts relate to one another.

To open this vault in Obsidian:
1. Open **Obsidian**.
2. Click **Open folder as vault** (or "Open..." under "Open folder as vault").
3. Select the folder `C:\onion.so\project-vault` (the folder where these notes are placed).
4. Press `Ctrl + G` (or click the Graph icon in the left ribbon) to view the interactive network graph of your codebase!

---

## 🗺️ High-Level Map

### Core Architecture
- [[Frontend Entry]]: The UI shell and main route controller.
- [[State Management]]: Global contexts driving auth and video state.
- [[Database & API]]: The Supabase and YouTube backend integration.

### Core Views & Layouts
- [[BiovisedPlayer]]: The custom consolidated video playback engine.
- [[AuthModal]]: Authentication interface & guest mode controller.
- [[VideoLibrary]]: Video exploration, playlists, and channel browsers.
- [[LecturesGrid]]: Main homepage/discovery feed component.
- [[TeacherProfileDetail]]: Educator information and schedules.

### Data & Services
- [[dbService]]: Local database queries and mutations.
- [[youtubeService]]: Data API ingestion pipeline.
- [[recommendationEngine]]: Smart playlist and video recommending logic.
