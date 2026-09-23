# ORCAI IF · Integrations-Cockpit & Schnittstellen-Lotse

> **Leitgedanke & Zielsetzung:**  
> Das Integrations-Cockpit (IF) nimmt den Interface-Entwickler bei der Definition, Abstimmung und Pflege von Schnittstellendokumentationen aktiv an die Hand. Es führt strukturiert durch den bürokratischen Dokumentationsakt und generiert dabei so viel wie irgend möglich automatisiert – von systemweiten Datenflüssen und BPMN-Prozessverknüpfungen bis hin zu KI-gestützten Formulierungsvorschlägen mit Multi-LLM-Zweitgutachten.

---

## Schnelleinstieg & Verknüpfte Dienste

- 📋 **Interface-Cockpit Live**: [orcai-54321.web.app/if/](https://orcai-54321.web.app/if/?model=ORCAI-MODEL-JOHANNESSTIFT-DIAKONIE-EA&int=JSD-INT-01)
- 🐙 **GitHub Repository**: [github.com/gonzo42nixon/if](https://github.com/gonzo42nixon/if)
- 💾 **ORCAI Persistenz-Dienst & Plattform**: [orcai-54321.web.app](https://orcai-54321.web.app/)
- 🏛️ **EA · Enterprise Architecture**: [orcai-54321.web.app/ea/](https://orcai-54321.web.app/ea/)

---

## 1. Einstieg & Modellübernahme

Das Cockpit visualisiert eine ausgewählte Integration aus dem übergeordneten Enterprise Architecture (EA) Modell (z. B. Johannesstift Diakonie `ORCAI-MODEL-JOHANNESSTIFT-DIAKONIE-EA` mit Interface `JSD-INT-01` oder `JSD-INT-03`).

- **Aufruf per URL-Parameter:**
  `https://orcai-54321.web.app/if/?model=ORCAI-MODEL-JOHANNESSTIFT-DIAKONIE-EA&int=JSD-INT-01`
  - `model`: Eindeutige ID des EA-Landschaftsmodells.
  - `int` (alternativ `id` oder `interfaceId`): ID der Schnittstelle.
- **Nahtlose Übergabe aus EA:**  
  Aus der interaktiven EA-Landkarte ([/ea/](https://orcai-54321.web.app/ea/)) kann über den Inspektor direkt in das IF-Cockpit verzweigt werden. Bei Bedarf wird der aktuelle flüchtige Sitzungsstand per lokaler Übergabe (`handoff`) mitgenommen.
- **Kopierbarer Permalink:**  
  Der kanonische Link lädt stets den aktuellen Modellstand aus der Quelle.

---

## 2. Visueller Datenfluss & BPMN-Deep-Link

Das Cockpit verbindet Enterprise Integration Patterns (EIP) mit konkreter Prozessmodellierung:

- **Interaktiver Datenfluss (`OrcaiIfDataFlow`):**  
  Zeigt Quellsysteme, Middleware-Hubs, Zielsysteme, Adapter/Verbindungen, Protokolle (z. B. MQTT, HL7 v2, FHIR R4, DICOM), Nachrichtenformate und Mappings auf einen Blick.
- **Bidirektionales Highlighting (`OrcaiIfLinking`):**  
  - Ein Klick auf ein System, eine Connection oder eine Rolle öffnet ein Detail-Modal.
  - Ein Mouse-Over (oder Tastaturfokus) im Datenfluss hebt sofort die korrespondierenden Lanes, MessageFlows und Aufgaben im eingebetteten BPMN 2.0 Viewer (`BpmnJS`) hervor – und umgekehrt.
- **Mensch-System-Interaktion (UX / Rollen):**  
  Modellierte Rollen und deren Clients (z. B. Notaufnahme-Pflegekraft via E-Care Triage) werden als interaktive Interaktions-Pills visuell mit Systemen und Prozesslanes verknüpft.

---

## 3. Der 10-Kapitel-Standard & Dokumenten-Reifegrad

Die Schnittstellendokumentation folgt einem praxiserprobten, 10-teiligen EAI-Standard:

1. **Metadaten und Änderungsstand** (Version, Autoren, Prüfer, Freigabe, Verwandte Dokumente)
2. **Management Summary** (Geschäftlicher Nutzen, Kritikalität, Nachrichtenvolumen, Service-Level-Agreements)
3. **Kontext und Geltungsbereich** (In-Scope, Out-of-Scope, Abhängigkeiten, Business Owner)
4. **Systeme und Schnittstellen** (Umgebung, Endpunkte ohne Secrets, Authentifizierung, Schemas, Timeouts, Rate Limits)
5. **Architektur und Entscheidungen** (Muster, Architekturentscheidungen, Alternativen, Idempotenz, Transaktionsgrenzen)
6. **Nachrichten und Mapping** (Feldmappings, Validierungsregeln, Standardwerte)
7. **Fehlerbehandlung und Wiederanlauf** (Fehlerklassen, Retry-Strategien, Dead-Letter-Queues, Replay)
8. **Monitoring und Betrieb** (Betriebsverantwortung, Metriken, Alarmierung, Log-Korrelation, Runbooks)
9. **Tests und Abnahme** (Synthetische Testfälle, Akzeptanzkriterien, Freigabenachweise)
10. **Anhänge und offene Punkte** (Glossar, Offene Klärungspunkte mit Owner & Frist, Standards)

### Reifegrad-Ampel:
- **Grün (100 %):** Alle Felder vollständig ausgefüllt.
- **Gelb (≥ 50 %):** In fortgeschrittener Ausarbeitung.
- **Rot (< 50 %):** Entwurf mit wesentlichen offenen Lücken.
> *Hinweis:* Die Ampeln spiegeln die formale Vollständigkeit wider, nicht die fachliche Freigabe.

---

## 4. Der KI-Architekt als Lotse ("Nächster Schritt?")

Um den bürokratischen Aufwand für Entwickler zu minimieren, integriert das Cockpit den **ORCAI KI-Architekten** direkt im rechten Drawer (`if-agent-bridge.js` & `guided-document.js`):

1. **Geführte Fortschreibung (`Nächster Schritt?`):**  
   Der Agent analysiert den aktuellen Dokumenten-Snapshot, erkennt das nächste noch unbesetzte Feld und unterbreitet einen konkreten Formulierungsvorschlag.
2. **Strenge Guardrails:**  
   - KI-Vorschläge werden ausschließlich als streng validiertes JSON ausgegeben.
   - Der Agent darf **keine Freigaben erfinden**, keine Sicherheitscredentials halluzinieren und keine unvollständigen Mockups als Realität deklarieren.
   - Nicht belegte Aussagen werden im Text zwingend als `ENTWURF` oder `Annahme` gekennzeichnet.
3. **Multi-LLM-Zweitgutachten (Second Opinion):**  
   Auf Knopfdruck holt das Cockpit eine unabhängige Zweitprüfung ein (z. B. Erstvorschlag via `openai/gpt-4o-mini`, kritisches Gegengutachten via `google/gemini-2.5-flash`).
4. **Menschliche Kontrolle (Human in the Loop):**  
   Der Entwickler kann den Vorschlag direkt im Browser editieren, ablehnen oder per Checkbox annehmen.

---

## 5. Verlässliche Nachweise statt Behauptungen

- **Synthetische Mapping-Tests:**  
  Mapping-Definitionen (z. B. JSONata) können mit hinterlegten synthetischen Beispielen direkt lokal im Cockpit ausgeführt werden.
- **HL7-Diff & Segmentvergleich:**  
  Bei HL7-Nachrichten erfolgt ein automatischer Segment- und Feldvergleich (MSH, PID, PV1 etc.).
- **Kryptografisches Quellen-Hashing (SHA-256):**  
  Der Inhalt wird normalisiert gehasht (volatile Zeitstempel werden ignoriert). Jede inhaltliche Änderung erzeugt einen neuen Hash.
- **Warn-Badge:**  
  Solange keine Freigabe dokumentiert ist, trägt das Cockpit unübersehbar das Badge `MODELLIERT · KEINE FREIGABE`.

---

## 6. Persistenz, Versionierung & Export

- **Unveränderliche Versionen im ORCAI Persistenz-Dienst:**  
  Über den Persistenz-Dienst ([orcai-54321.web.app](https://orcai-54321.web.app/)) werden Dokumente mandantenfähig in Firestore (Envelopes) und Google Cloud Storage (JSON-Payloads) abgelegt. Jede Speicherung legt eine neue Version an (V1, V2, ...).
- **Historien-Navigation:**  
  Über Vor-/Zurück-Schaltflächen kann jederzeit in historische Versionen gesprungen werden.
- **Share-Link & QR-Code:**  
  Teilen-Links und dynamisch generierte SVG-QR-Codes führen direkt zur aktuellen Version des Cockpits.
- **1-Seiten-DIN-A4-Vektor-PDF (`one-page-pdf.js`):**  
  Erzeugt auf Knopfdruck ein druckfertiges, vektorisiertes DIN-A4-Dokument mit Datenfluss, BPMN-Prozessdiagramm, Metadaten, 10-Kapitel-Status und QR-Rücksprunglink.

---

## 7. Entwicklung & Mitwirken

Quellcode und Weiterentwicklung werden im GitHub-Repository gepflegt:  
👉 **[https://github.com/gonzo42nixon/if](https://github.com/gonzo42nixon/if)**
