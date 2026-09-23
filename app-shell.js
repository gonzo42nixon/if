const firebaseApp = firebase.initializeApp(window.ORCAI_FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(error => console.warn("[ORCAI Auth]", error));
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

class OrcaiAppShell extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready) return;
    this.dataset.ready = "true";
    this.innerHTML = `
      <button class="orcai-icon-button orcai-menu-trigger orcai-shelf-trigger" data-action="shelf" type="button" title="Shelf" aria-label="Shelf &ouml;ffnen" aria-expanded="false" hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h14v5H5zM5 11h14v9H5z"/><path d="M9 7h6M9 15h6"/></svg>
      </button>
      <header class="orcai-toolbar" aria-label="Aktionen">
        <nav class="orcai-actions" aria-label="Seitenaktionen">
          <a class="orcai-icon-button" href="https://console.firebase.google.com/project/orcai-54321/firestore/databases/-default-/data" target="_blank" rel="noopener noreferrer" title="Firestore-Datenbank" aria-label="Firestore-Datenbank in neuem Tab öffnen">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#FFA000" d="M4.3 18.6 6 3.2c.1-.7 1-.8 1.4-.2l2.1 4 1.7-3.2c.3-.5.7-.5.9 0l1.7 3.2 2.1-4c.4-.6 1.3-.5 1.4.2L19 18.6l-7.3 4.1Z"/>
              <path fill="#F57C00" d="m9.5 7-5.2 11.6 7.4 4.1 2.1-15.6-1.7-3.3c-.2-.5-.6-.5-.9 0Z"/>
              <path fill="#FFCA28" d="m17.2 3.2 1.7 15.4-7.2 4.1L16 3c.4-.6 1.1-.5 1.2.2Z"/>
              <path fill="#FFF" fill-opacity=".25" d="m4.3 18.6.1-.5 7.2 4.1 7.2-4.1.1.5-7.3 4.1Z"/>
            </svg>
          </a>
          <a class="orcai-icon-button" data-action="knowledge-graph" href="/okf/" target="_blank" rel="noopener noreferrer" title="ORCAI Runtime Knowledge Graph" aria-label="ORCAI Runtime Knowledge Graph in neuem Tab öffnen" hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="5" cy="12" r="2.25"/><circle cx="12" cy="5" r="2.25"/><circle cx="19" cy="12" r="2.25"/><circle cx="12" cy="19" r="2.25"/><path d="m6.6 10.4 3.8-3.8m3.2 0 3.8 3.8m0 3.2-3.8 3.8m-3.2 0-3.8-3.8"/>
            </svg>
          </a>
          <button class="orcai-icon-button" data-action="share" type="button" title="Teilen" aria-label="Seite teilen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>
          </button>
          <button class="orcai-icon-button" data-action="fullscreen" type="button" title="Vollbild" aria-label="Vollbild umschalten">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>
          </button>
          <button class="orcai-icon-button" data-action="theme" type="button" title="Theme wechseln" aria-label="Theme wechseln">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9c0-.5-.04-1-.12-1.47A7 7 0 0 1 12 3Z"/></svg>
          </button>
          <button class="orcai-icon-button" data-action="info" type="button" title="Hilfe" aria-label="Hilfetext öffnen"><span class="orcai-info-glyph" aria-hidden="true">i</span></button>
        </nav>
        <nav class="orcai-object-actions" aria-label="Objektaktionen" hidden>
          <span class="orcai-selection-count" aria-live="polite">0 ausgewählt</span>
          <button class="orcai-album-selection-finish" data-action="finish-album-selection" type="button" hidden>Fertig</button>
          <button class="orcai-icon-button" data-action="delete-selection" type="button" title="Ausgewählte Objekte löschen" aria-label="Ausgewählte Objekte löschen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>
          </button>
          <button class="orcai-icon-button" data-action="clear-selection" type="button" title="Auswahl aufheben" aria-label="Auswahl aufheben">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </nav>
        <div class="orcai-account">
          <button class="orcai-avatar" data-action="account" type="button" title="Google-Konto" aria-label="Kontomenü öffnen" aria-haspopup="menu" aria-expanded="false">G</button>
          <div class="orcai-account-menu" role="menu" hidden>
            <div class="orcai-user-label" hidden></div>
            <button class="orcai-menu-button" data-action="auth" type="button" role="menuitem">Mit Google anmelden</button>
          </div>
        </div>
      </header>
      <aside class="orcai-shelf" aria-label="Shelf" hidden>
        <div class="orcai-shelf-head"><button class="orcai-icon-button orcai-shelf-burger" data-action="drawer" type="button" title="Konfiguration" aria-label="Konfigurationsmen&uuml; umschalten" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><strong>Sammlungen</strong><button class="orcai-icon-button" data-action="close-shelf" type="button" title="Shelf schlie&szlig;en" aria-label="Shelf schlie&szlig;en">‹</button></div>
        <nav class="orcai-collections" aria-label="Sammlungen">
          <button class="orcai-collection-link orcai-home-link is-active" data-action="view" data-view="timeline" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 11 12 4l9 7v9H5v-9"/><path d="M9 20v-6h6v6"/></svg>ORCAI-Objekte</button>
          <span class="orcai-collection-heading">Sammlungen</span>
          <div class="orcai-album-nav"><button class="orcai-collection-expander" data-action="toggle-albums" type="button" aria-label="Alben aufklappen" aria-expanded="false">›</button><button class="orcai-collection-link" data-action="view" data-view="albums" type="button">Alben</button></div>
          <div class="orcai-album-list" hidden></div>
          <button class="orcai-collection-link" data-action="view" data-view="images" type="button">Bilder</button>
          <button class="orcai-collection-link" data-action="view" data-view="bpmn" type="button">BPMN</button>
          <button class="orcai-collection-link" data-action="view" data-view="html" type="button">HTML</button>
          <button class="orcai-collection-link" data-action="view" data-view="json" type="button">JSON</button>
          <button class="orcai-collection-link" data-action="view" data-view="markdown" type="button">Markdown</button>
          <button class="orcai-collection-link" data-action="view" data-view="pdf" type="button">PDF</button>
        </nav>
      </aside>
      <button class="orcai-scrim" data-action="close-drawer" type="button" aria-label="Men&uuml; schlie&szlig;en" hidden></button>
      <aside class="orcai-drawer" aria-label="Konfiguration" hidden>
        <div class="orcai-drawer-header">
          <h2 class="orcai-drawer-title">Konfiguration</h2>
          <button class="orcai-icon-button" data-action="close-drawer" type="button" title="Schlie&szlig;en" aria-label="Men&uuml; schlie&szlig;en">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <details class="orcai-settings-group" open>
          <summary>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 4 4"/></svg>
            Hintergrund
            <svg class="orcai-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </summary>
          <div class="orcai-settings-body">
            <label class="orcai-field">
              <span class="orcai-field-label">Konfigurationsprofil</span>
              <select class="orcai-profile-select" data-setting="profile" aria-label="Hintergrundprofil ausw&auml;hlen">
                <option value="guest">Vor Anmeldung</option>
                <option value="signedIn">Angemeldet</option>
              </select>
              <small class="orcai-settings-hint">Beide Ansichten werden getrennt gespeichert. Die Gastansicht bleibt auf diesem Ger&auml;t verf&uuml;gbar.</small>
            </label>
            <label class="orcai-field">
              <span class="orcai-field-label">Bild</span>
              <span class="orcai-background-preview-row"><span class="orcai-background-preview" role="img" aria-label="Vorschau des aktuellen Hintergrundbildes"></span><span class="orcai-file-picker"><label class="orcai-file-action" for="orcai-background-file" title="Add file">Add</label><input id="orcai-background-file" class="orcai-file-input" data-setting="image" type="file" accept="image/*" aria-label="Add file"><span class="orcai-file-name" title="Kein Bild ausgew&auml;hlt">Kein Bild ausgew&auml;hlt</span></span></span>
            </label>
            <span class="orcai-switch-row" title="Show Background Image">
              <span>Show</span>
              <label class="orcai-switch" title="Show Background Image"><input data-setting="show" type="checkbox" checked aria-label="Show Background Image"><span class="orcai-switch-track"></span></label>
            </span>
            <label class="orcai-field">
              <span class="orcai-field-label">Farbe</span>
              <span class="orcai-color-row"><input class="orcai-color-input" data-setting="color" type="color" value="#add8e6"><span class="orcai-color-value">#add8e6</span></span>
            </label>
            <label class="orcai-field">
              <span class="orcai-field-label">Bildtransparenz</span>
              <span class="orcai-range-row"><input class="orcai-range" data-setting="opacity" type="range" min="0" max="100" value="50"><output>50 %</output></span>
            </label>
            <span class="orcai-switch-row">
              <span>Bild weichzeichnen</span>
              <label class="orcai-switch"><input data-setting="blur" type="checkbox"><span class="orcai-switch-track"></span></label>
            </span>
            <div class="orcai-background-actions">
              <button class="orcai-settings-button" data-action="save-background-cloud" type="button">In ORCAI speichern</button>
              <button class="orcai-settings-button secondary" data-action="reset-background" type="button">Zur&uuml;cksetzen</button>
            </div>
            <p class="orcai-settings-status" role="status" aria-live="polite">Lokal gespeichert.</p>
          </div>
        </details>
      </aside>
      <button class="orcai-create-button" data-action="create" type="button" title="Erstellen" aria-label="Erstellen" hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <div class="orcai-create-popout" role="menu" aria-label="Erstellen und hinzuf&uuml;gen" hidden>
        <span class="orcai-popout-heading">Erstellen</span>
        <button data-action="upload-file" type="button" role="menuitem"><strong>Vom Gerät hochladen</strong><small>Bilder, Dokumente, PDFs</small></button>
        <button data-action="create-album" type="button" role="menuitem"><strong>Album</strong><small class="orcai-create-context">Aus der aktuellen Auswahl</small></button>
        <span class="orcai-popout-heading">Hinzuf&uuml;gen</span>
        <button data-action="add-to-album" type="button" role="menuitem"><strong>Zu Album hinzuf&uuml;gen</strong><small>Ausgewählte Objekte</small></button>
        <button data-action="set-album-cover" type="button" role="menuitem"><strong>Als Albendeckblatt</strong><small>Ein Objekt im geöffneten Album</small></button>
      </div>
      <dialog class="orcai-dialog">
        <div class="orcai-dialog-content">
          <h2>Orchestrated AI</h2>
          <p></p>
          <div class="orcai-dialog-actions"><button class="orcai-close-button" type="button">Schließen</button></div>
        </div>
      </dialog>
      <div class="orcai-toast" role="status" aria-live="polite"></div>`;

    this.$ = selector => this.querySelector(selector);
    this.menu = this.$(".orcai-account-menu");
    this.avatar = this.$(".orcai-avatar");
    this.authButton = this.$('[data-action="auth"]');
    this.createButton = this.$('[data-action="create"]');
    this.menuTrigger = this.$('[data-action="drawer"]');
    this.shelfTrigger = this.$('[data-action="shelf"]');
    this.shelf = this.$('.orcai-shelf');
    this.createPopout = this.$('.orcai-create-popout');
    this.drawer = this.$(".orcai-drawer");
    this.scrim = this.$(".orcai-scrim");
    this.userLabel = this.$(".orcai-user-label");
    this.dialog = this.$(".orcai-dialog");
    this.pageActions = this.$(".orcai-actions");
    this.objectActions = this.$(".orcai-object-actions");
    this.selectionCount = this.$(".orcai-selection-count");
    this.knowledgeGraphAction = this.$('[data-action="knowledge-graph"]');
    this.$(".orcai-dialog p").textContent = this.getAttribute("help-text") || "Noch kein Hilfetext vorhanden.";

    this.addEventListener("click", event => this.handleClick(event));
    document.addEventListener("click", event => {
      if (!this.contains(event.target)) { this.closeMenu(); this.closeCreatePopout(); return; }
      if (!event.target.closest('.orcai-create-popout,[data-action="create"]')) this.closeCreatePopout();
    });
    document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(this.albumSelectionMode)document.dispatchEvent(new CustomEvent('orcai:cancel-album-selection'));else this.closeCreatePopout()});
    this.$(".orcai-close-button").addEventListener("click", () => this.dialog.close());
    this.dialog.addEventListener("click", event => { if (event.target === this.dialog) this.dialog.close(); });
    this.querySelectorAll("[data-setting]").forEach(control => control.addEventListener("input", event => this.updateBackground(event)));
    this.restoreBackground();

    auth.onAuthStateChanged(user => this.handleAuthState(user));
    document.addEventListener("orcai:selection-change", event => this.renderSelection(event.detail?.count || 0));
    document.addEventListener("orcai:albums-change", event => this.renderAlbums(event.detail?.albums || []));
    document.addEventListener("orcai:album-selection-mode", event => { this.albumSelectionMode=Boolean(event.detail?.active);this.$('.orcai-album-selection-finish').hidden=!this.albumSelectionMode;this.$('[data-action="delete-selection"]').hidden=this.albumSelectionMode;this.renderSelection(event.detail?.count||0); });
    document.addEventListener("orcai:knowledge-context", event => { const url=String(event.detail?.url||'').trim();this.knowledgeGraphAction.hidden=!url;if(url)this.knowledgeGraphAction.href=url; });
  }

  async handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "share") return this.share();
    if (action === "fullscreen") return this.fullscreen();
    if (action === "theme") return this.toggleTheme();
    if (action === "info") return this.openHelp();
    if (action === "account") return this.toggleMenu();
    if (action === "shelf") return this.toggleShelf();
    if (action === "close-shelf") return this.closeShelf();
    if (action === "drawer") return this.toggleDrawer();
    if (action === "close-drawer") return this.closeDrawer();
    if (action === "auth") return auth.currentUser ? this.logout() : this.login();
    if (action === "save-background-cloud") return this.saveBackgroundToCloud();
    if (action === "reset-background") return this.resetBackground();
    if (action === "create") return this.toggleCreatePopout();
    if (action === "upload-file") { this.closeCreatePopout(); return document.dispatchEvent(new CustomEvent("orcai:upload-file")); }
    if (action === "create-album") { this.closeCreatePopout(); return document.dispatchEvent(new CustomEvent("orcai:create-album")); }
    if (action === "add-to-album") { this.closeCreatePopout(); return document.dispatchEvent(new CustomEvent("orcai:add-to-album")); }
    if (action === "set-album-cover") { this.closeCreatePopout(); return document.dispatchEvent(new CustomEvent("orcai:set-album-cover")); }
    if (action === "finish-album-selection") return document.dispatchEvent(new CustomEvent("orcai:finish-album-selection"));
    if (action === "toggle-albums") return this.toggleAlbumList(button);
    if (action === "view") return this.selectView(button.dataset.view, button.dataset.album || "");
    if (action === "delete-selection") document.dispatchEvent(new CustomEvent("orcai:delete-selection"));
    if (action === "clear-selection") document.dispatchEvent(new CustomEvent(this.albumSelectionMode ? "orcai:cancel-album-selection" : "orcai:clear-selection"));
  }

  renderSelection(count) {
    this.pageActions.hidden = count > 0 || this.albumSelectionMode;
    this.objectActions.hidden = count === 0 && !this.albumSelectionMode;
    this.selectionCount.textContent = `${count} ausgewählt`;
    this.$('.orcai-create-context').textContent = count ? `${count} ausgewählte ${count === 1 ? 'Objekt' : 'Objekte'}` : 'Leeres Album';
  }

  openHelp() {
    const url = String(this.getAttribute("help-url") || "").trim();
    if (!url) return this.dialog.showModal();
    const popup = window.open(url, "ORCAI_HELP", "popup=yes,width=1100,height=820,resizable=yes,scrollbars=yes");
    if (!popup) this.notify("Das Hilfefenster wurde vom Browser blockiert.");
    else popup.focus();
  }

  renderAlbums(albums) {
    const list=this.$('.orcai-album-list'),recent=[...albums].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,5).sort((a,b)=>String(a.label||a.key).localeCompare(String(b.label||b.key),'de'));
    list.innerHTML=recent.map(album=>`<button class="orcai-album-link" data-action="view" data-view="album" data-album="${this.escapeAttribute(album.key)}" type="button">${this.escapeAttribute(album.label||album.key)}</button>`).join('')+(albums.length?'<button class="orcai-album-link orcai-all-albums" data-action="view" data-view="albums" type="button">Alle Alben anzeigen</button>':'<span class="orcai-no-albums">Noch keine Alben</span>');
  }

  async login() {
    this.closeMenu();
    try {
      if (location.protocol === "file:") {
        this.notify("Google Login benötigt HTTP oder HTTPS. Bitte die veröffentlichte Website öffnen.");
        return;
      }
      await auth.signInWithPopup(provider);
    }
    catch (error) {
      if (error.code !== "auth/popup-closed-by-user") this.notify("Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
    }
  }

  async logout() {
    this.closeMenu();
    try { await auth.signOut(); this.notify("Abgemeldet."); }
    catch { this.notify("Abmeldung fehlgeschlagen."); }
  }

  renderUser(user) {
    this.createButton.hidden = !user;
    this.shelfTrigger.hidden = !user;
    if (!user) this.closeShelf();
    this.authButton.textContent = user ? "Abmelden" : "Mit Google anmelden";
    this.userLabel.hidden = !user;
    this.userLabel.textContent = user?.email || "";
    this.avatar.innerHTML = user?.photoURL
      ? `<img src="${this.escapeAttribute(user.photoURL)}" alt="Profilbild von ${this.escapeAttribute(user.displayName || "Google-Nutzer")}">`
      : (user?.displayName?.trim()?.[0] || "G").toUpperCase();
  }

  async handleAuthState(user) {
    this.renderUser(user);
    this.backgroundProfile = user ? "signedIn" : "guest";
    this.$('[data-setting="profile"]').value = this.backgroundProfile;
    if (user) await this.loadBackgroundFromCloud(user).catch(error => {
      console.warn("[ORCAI Background]", error);
      this.setBackgroundStatus("Online-Konfiguration nicht verf&uuml;gbar; lokale Einstellung aktiv.", true);
      this.showBackgroundProfile("signedIn");
    });
    else this.showBackgroundProfile("guest");
  }

  escapeAttribute(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  toggleMenu() {
    const open = this.menu.hidden;
    this.menu.hidden = !open;
    this.avatar.setAttribute("aria-expanded", String(open));
  }

  closeMenu() { this.menu.hidden = true; this.avatar.setAttribute("aria-expanded", "false"); }
  toggleShelf() { this.shelf.hidden ? this.openShelf() : this.closeShelf(); }
  openShelf() { this.shelf.hidden=false; this.shelfTrigger.setAttribute('aria-expanded','true'); document.body.classList.add('orcai-shelf-open'); }
  closeShelf() { this.closeDrawer(); this.shelf.hidden=true; this.shelfTrigger?.setAttribute('aria-expanded','false'); document.body.classList.remove('orcai-shelf-open'); }
  toggleDrawer() { this.drawer.hidden ? this.openDrawer() : this.closeDrawer(); }
  openDrawer() { this.drawer.hidden = false; this.scrim.hidden = false; this.menuTrigger.setAttribute("aria-expanded", "true"); document.body.classList.add('orcai-config-open'); }
  closeDrawer() { this.drawer.hidden = true; this.scrim.hidden = true; this.menuTrigger?.setAttribute("aria-expanded", "false"); document.body.classList.remove('orcai-config-open'); }
  toggleCreatePopout() { const open=this.createPopout.hidden;this.createPopout.hidden=!open;this.createButton.setAttribute('aria-expanded',String(open)); }
  closeCreatePopout() { this.createPopout.hidden=true;this.createButton.setAttribute('aria-expanded','false'); }
  toggleAlbumList(button) { const list=this.$('.orcai-album-list'),open=list.hidden;list.hidden=!open;button.textContent=open?'⌄':'›';button.setAttribute('aria-expanded',String(open)); }
  selectView(view,album='') { this.querySelectorAll('.orcai-collection-link,.orcai-album-link').forEach(item=>item.classList.toggle('is-active',item.dataset.view===view&&(!album||item.dataset.album===album)));if(view==='album')this.closeShelf();document.dispatchEvent(new CustomEvent('orcai:view-change',{detail:{view,album}})); }
  toggleTheme() { document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; }

  restoreBackground() {
    const legacy = this.readJson("orcai-background");
    const stored = this.readJson("orcai-background-profiles");
    const migrated = legacy.version === 2 ? this.normalizeBackground(legacy) : this.defaultBackground();
    this.backgroundProfiles = stored.version === 3
      ? { guest: this.normalizeBackground(stored.guest), signedIn: this.normalizeBackground(stored.signedIn) }
      : { guest: { ...migrated }, signedIn: this.defaultBackground() };
    this.backgroundProfile = "guest";
    if (stored.version !== 3 && legacy.version === 2) localStorage.removeItem("orcai-background");
    this.persistBackgroundProfiles();
    this.showBackgroundProfile("guest");
  }

  updateBackground(event) {
    const type = event.target.dataset.setting;
    if (type === "profile") return this.showBackgroundProfile(event.target.value);
    if (this.backgroundProfile === "guest" && !this.canEditGuestBackground()) { this.setBackgroundStatus("Das Profil „Vor Anmeldung“ kann nur vom ORCAI-Super-User geändert werden.",true);this.renderBackgroundControls(this.backgroundProfiles.guest);return; }
    const settings = { ...this.backgroundProfiles[this.backgroundProfile] };
    if (type === "image") {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 4_000_000) return this.notify("Das Hintergrundbild darf maximal 4 MB gro&szlig; sein.");
      const reader = new FileReader();
      reader.onload = () => this.saveBackground({ ...settings, image: reader.result, imagePath: "", imageName: file.name });
      reader.readAsDataURL(file);
      return;
    }
    if (type === "color") settings.color = event.target.value;
    if (type === "opacity") settings.opacity = Number(event.target.value);
    if (type === "blur") settings.blur = event.target.checked;
    if (type === "show") settings.show = event.target.checked;
    this.saveBackground(settings);
  }

  saveBackground(settings) {
    const complete = this.normalizeBackground(settings);
    this.backgroundProfiles[this.backgroundProfile] = complete;
    if (!this.persistBackgroundProfiles()) return;
    this.renderBackgroundControls(complete);
    this.applyBackground(complete);
    this.setBackgroundStatus("Lokal gespeichert. Für andere Geräte bitte in ORCAI speichern.");
  }

  defaultBackground() { return { color: "#add8e6", opacity: 50, blur: false, show: true, image: "./background.png", imagePath: "", imageName: "ORCAI Standard" }; }
  normalizeBackground(settings={}) {
    const fallback=this.defaultBackground(), opacity=Number(settings.opacity);
    return { ...fallback, ...settings, opacity:Number.isFinite(opacity)?Math.max(0,Math.min(100,opacity)):fallback.opacity, blur:Boolean(settings.blur), show:settings.show!==false };
  }
  readJson(key) { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } }
  persistBackgroundProfiles() {
    try { localStorage.setItem("orcai-background-profiles", JSON.stringify({ version:3, ...this.backgroundProfiles })); return true; }
    catch { this.notify("Das Bild ist zu gro&szlig; f&uuml;r den lokalen Speicher."); return false; }
  }
  showBackgroundProfile(profile) {
    this.backgroundProfile = profile === "signedIn" ? "signedIn" : "guest";
    this.$('[data-setting="profile"]').value = this.backgroundProfile;
    const settings=this.normalizeBackground(this.backgroundProfiles[this.backgroundProfile]);
    this.backgroundProfiles[this.backgroundProfile]=settings;
    this.renderBackgroundControls(settings);
    this.applyBackground(settings);
    this.setBackgroundStatus(this.backgroundProfile === "guest" ? "Gastansicht – lokal gespeichert." : (auth.currentUser ? "Angemeldete Ansicht – lokale Einstellung." : "Zum Online-Speichern bitte anmelden."));
  }
  renderBackgroundControls(settings) {
    const imageName=settings.imageName||this.imageNameFromSource(settings.image)||"Kein Bild ausgewählt";
    const hasImage=Boolean(settings.image);
    const imageNameNode=this.$('.orcai-file-name');imageNameNode.textContent=imageName;imageNameNode.title=imageName;
    const imageInput=this.$('[data-setting="image"]'),fileAction=this.$('.orcai-file-action'),fileLabel=hasImage?'Change':'Add',fileTitle=hasImage?'Change file':'Add file';imageInput.value='';imageInput.setAttribute('aria-description',`Aktuell ausgewählt: ${imageName}`);imageInput.setAttribute('aria-label',fileTitle);fileAction.textContent=fileLabel;fileAction.title=fileTitle;
    const preview=this.$('.orcai-background-preview');preview.style.backgroundImage=settings.image?`url("${String(settings.image).replaceAll('"','%22')}")`:'none';preview.classList.toggle('is-empty',!settings.image);preview.title=imageName;preview.setAttribute('aria-label',`Hintergrundvorschau: ${imageName}`);
    this.$('[data-setting="color"]').value=settings.color;
    this.$(".orcai-color-value").textContent=settings.color;
    this.$('[data-setting="opacity"]').value=settings.opacity;
    this.$('[data-setting="opacity"] + output').textContent=`${settings.opacity} %`;
    this.$('[data-setting="blur"]').checked=settings.blur;
    this.$('[data-setting="show"]').checked=settings.show!==false;
    const guestLocked=this.backgroundProfile==='guest'&&!this.canEditGuestBackground();this.querySelectorAll('.orcai-settings-body [data-setting]:not([data-setting="profile"])').forEach(control=>control.disabled=guestLocked);fileAction.classList.toggle('is-disabled',guestLocked);fileAction.setAttribute('aria-disabled',String(guestLocked));
  }
  canEditGuestBackground() { return String(auth.currentUser?.email||'').toLowerCase()==='drueffler@gmail.com'; }
  imageNameFromSource(source='') { const value=String(source||'');if(!value)return'';if(value==='./background.png')return'ORCAI Standard';try{const pathname=new URL(value,location.href).pathname,name=decodeURIComponent(pathname.split('/').pop()||'');return name||'';}catch{return'';} }
  setBackgroundStatus(message,error=false) { const status=this.$('.orcai-settings-status');status.textContent=message;status.classList.toggle('error',error); }
  async resetBackground() { this.saveBackground(this.defaultBackground()); }
  async saveBackgroundToCloud() {
    const user=auth.currentUser;
    if(!user){this.setBackgroundStatus("Bitte zuerst mit Google anmelden.",true);this.toggleMenu();return;}
    const button=this.$('[data-action="save-background-cloud"]');button.disabled=true;this.setBackgroundStatus("Wird in ORCAI gespeichert …");
    try {
      const profiles={};
      for(const name of ['guest','signedIn']) profiles[name]=await this.prepareBackgroundForCloud(name,user);
      await db.doc(`clients/ACME/preferences/${user.uid}`).set({ownerUid:user.uid,backgroundProfiles:profiles,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),schemaVersion:1},{merge:true});
      this.persistBackgroundProfiles();this.setBackgroundStatus("Beide Hintergrundprofile wurden in ORCAI gespeichert.");this.notify("Hintergrundkonfiguration online gespeichert.");
    } catch(error) { console.error("[ORCAI Background save]",error);this.setBackgroundStatus(`Speichern fehlgeschlagen: ${error.message}`,true); }
    finally { button.disabled=false; }
  }
  async prepareBackgroundForCloud(name,user) {
    const settings=this.normalizeBackground(this.backgroundProfiles[name]);
    if(String(settings.image||'').startsWith('data:')) {
      const response=await fetch(settings.image), blob=await response.blob(), path=`clients/ACME/preferences/${user.uid}/background-${name}`;
      const ref=storage.ref(path);await ref.put(blob,{contentType:blob.type||'image/jpeg',customMetadata:{ownerUid:user.uid,clientId:'ACME',profile:name}});
      settings.imagePath=`gs://${storage.app.options.storageBucket}/${path}`;settings.image=await ref.getDownloadURL();this.backgroundProfiles[name]=settings;
    }
    return { color:settings.color,opacity:settings.opacity,blur:settings.blur,show:settings.show!==false,imagePath:settings.imagePath||'',imageName:settings.imageName||'' };
  }
  async loadBackgroundFromCloud(user) {
    const snap=await db.doc(`clients/ACME/preferences/${user.uid}`).get();
    if(!snap.exists){this.showBackgroundProfile('signedIn');this.setBackgroundStatus("Noch keine Online-Konfiguration. Lokale Einstellung aktiv.");return;}
    const cloud=snap.data()?.backgroundProfiles||{};
    for(const name of ['guest','signedIn']) if(cloud[name]) {
      const settings=this.normalizeBackground(cloud[name]);
      if(settings.imagePath) settings.image=await storage.refFromURL(settings.imagePath).getDownloadURL();
      this.backgroundProfiles[name]=settings;
    }
    this.persistBackgroundProfiles();this.showBackgroundProfile('signedIn');this.setBackgroundStatus("Persönliche ORCAI-Konfiguration geladen.");
  }

  applyBackground(settings) {
    const style = document.documentElement.style;
    document.body.style.backgroundColor = settings.color;
    style.setProperty("--background-image", settings.show!==false && settings.image ? `url("${String(settings.image).replaceAll('"', '%22')}")` : "none");
    style.setProperty("--background-image-opacity", String(settings.opacity / 100));
    style.setProperty("--background-blur", settings.blur ? "12px" : "0px");
  }

  async share() {
    const request = new CustomEvent("orcai:share-request", { cancelable: true });
    if (!document.dispatchEvent(request)) return;
    try {
      if (navigator.share) await navigator.share({ title: document.title, text: "Orchestrated AI", url: location.href });
      else { await navigator.clipboard.writeText(location.href); this.notify("Link wurde kopiert."); }
    } catch (error) { if (error.name !== "AbortError") this.notify("Teilen ist derzeit nicht verfügbar."); }
  }

  async fullscreen() {
    try { document.fullscreenElement ? await document.exitFullscreen() : await document.documentElement.requestFullscreen(); }
    catch { this.notify("Vollbild ist in diesem Browser nicht verfügbar."); }
  }

  notify(message) {
    const toast = this.$(".orcai-toast");
    clearTimeout(this.toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    this.toastTimer = setTimeout(() => toast.classList.remove("visible"), 2800);
  }
}

customElements.define("orcai-app-shell", OrcaiAppShell);
