# 🌳 Villaggio

Gioco mobile (Android / iOS) di raccolta risorse, costruzione ed evoluzione:
si parte soli in una foresta selvaggia e — fase dopo fase — il mondo si
trasforma in una metropoli viva.

Scritto in **HTML, CSS e JavaScript puri** (moduli ES, nessun bundler, nessuna
libreria di gioco) e impacchettato come **app nativa** con Capacitor.

---

## Stato: Fasi 1-4 complete ✅

La prima fase è quella che il resto del gioco userà come fondamenta, quindi è
stata rifinita fino in fondo prima di proseguire:

| Funzionalità | Stato |
|---|---|
| Movimento fluido con joystick virtuale dinamico | ✅ |
| Camera morbida con anticipo sul movimento e scuotimento | ✅ |
| Taglio automatico degli alberi (nessun pulsante) | ✅ |
| Caduta dell'albero animata, ceppo, ricrescita | ✅ |
| Tronchi che schizzano, rimbalzano e vengono attratti | ✅ |
| **Catasta fisica sulla schiena** che cresce e oscilla | ✅ |
| Consegna automatica al cantiere entrando nell'area | ✅ |
| Costruzione della capanna con animazione di emersione | ✅ |
| Vendita automatica al mercante + monete che volano | ✅ |
| Potenziamenti (ascia, zaino, stivali) che **cambiano il modello 3D** | ✅ |
| Particelle, numeri volanti, ombre, suoni, vibrazione | ✅ |
| Salvataggio automatico dei progressi | ✅ |
| Qualità adattiva per tenere alti gli FPS | ✅ |

### Fase 2 — Il villaggio prende vita

| Funzionalità | Stato |
|---|---|
| **Pietra**: massi da frantumare col piccone | ✅ |
| Piccone che compare davvero in mano (nuova animazione) | ✅ |
| Cantieri a catena: segheria → cava → casa → magazzino | ✅ |
| Cantieri da **sbloccare con le monete** prima di costruirli | ✅ |
| Ogni edificio dà un bonus reale (+risorse, +capienza) | ✅ |
| **Il villaggio cresce da solo**: 5 livelli, arredi che spuntano | ✅ |
| Staccionata perimetrale con cancello | ✅ |
| **Abitanti** che camminano, lavorano, si siedono e chiacchierano | ✅ |
| **Lupi**: ti avvistano, ti inseguono, mordono e rubano risorse | ✅ |
| Combattimento automatico, salute, svenimento senza game over | ✅ |
| 8 potenziamenti, tutti visibili sul modello del personaggio | ✅ |

### Fase 3 — Il paese

| Funzionalità | Stato |
|---|---|
| **Fiume** che serpeggia e taglia la mappa: invalicabile | ✅ |
| **Ponte** da costruire: apre la sponda nord | ✅ |
| **Ferro**, solo oltre il fiume, col piccone d'acciaio | ✅ |
| **Mulino** con le pale che girano davvero | ✅ |
| **Fucina** con la forgia accesa e le scintille | ✅ |
| **Strade lastricate** che sostituiscono i sentieri di terra | ✅ |
| Carri trainati dagli abitanti attraverso il paese | ✅ |
| Lampioni, abbeveratoi, nuovi arredi urbani | ✅ |
| 11 potenziamenti, 8 costruzioni, 8 livelli di crescita | ✅ |

### Fase 4 — La grande città

| Funzionalità | Stato |
|---|---|
| **Oro**: filoni rari nel profondo della sponda nord | ✅ |
| **Municipio** con torre dell'orologio | ✅ |
| **Botteghe** con vetrine, tendine e insegne | ✅ |
| **Parco** con fontana zampillante, statua, aiuole e siepi | ✅ |
| **Banca** con cupola: rendita passiva in monete | ✅ |
| **Ospedale**: guarigione molto più rapida | ✅ |
| **Strade asfaltate** con segnaletica orizzontale | ✅ |
| La **staccionata viene smontata**: la città l'ha superata | ✅ |
| Lampioni elettrici, panchine di ghisa, cestini, aiuole | ✅ |
| Fino a 46 abitanti, con LOD di simulazione | ✅ |
| 14 potenziamenti, 13 costruzioni, 13 livelli di crescita | ✅ |

La Fase 5 (metropoli: grattacieli, auto, semafori, tram) è descritta in fondo:
l'architettura è già predisposta.

---

## Come si gioca

Non ci sono menù: **tutto succede nel mondo**.

- **Muoversi** — appoggia il dito ovunque sullo schermo: nasce lì un joystick.
  Su desktop: `WASD` o frecce.
- **Tagliare** — avvicinati a un albero e fermati: il personaggio inizia da solo.
- **Scavare** — stessa cosa con i massi di pietra, ma serve il **piccone**
  (si compra al banco dell'artigiano). Senza, un fumetto te lo ricorda.
  Il **ferro** sta oltre il fiume e vuole il piccone d'acciaio;
  l'**oro** è più a nord ancora e serve il piccone da minatore.
- **Attraversare** — il fiume ti blocca finché non costruisci il ponte.
  È il confine che rende la sponda nord una conquista.
- **Combattere** — quando un lupo ti arriva addosso attacchi da solo. Se cadi
  non è un game over: ti risvegli al falò avendo perso metà del carico.
- **Raccogliere** — i tronchi si impilano automaticamente sulla schiena.
  Più ne porti, più la catasta è alta (e più sei lento).
- **Costruire** — entra nell'area del progetto azzurro: i materiali partono da
  soli finché la barra non è piena.
- **Vendere** — entra nell'area del mercante: le risorse diventano monete.
- **Potenziare** — vai al banco dell'artigiano con abbastanza monete e resta
  fermo un istante.
- **Sbloccare cantieri** — i progetti chiusi 🔒 si aprono pagando in monete,
  sempre restando fermi un attimo nell'area.

Ogni edificio completato fa **salire di livello il villaggio**: spuntano orti,
panchine, pozzi, bracieri e staccionate, e arrivano nuovi abitanti.

---

## Eseguire il progetto

### In un browser (sviluppo veloce)

Serve un server HTTP: i moduli ES non funzionano aprendo il file da disco.

```bash
npm install
npx serve .          # oppure: python3 -m http.server 8080
```

Poi apri `http://localhost:8080` e attiva la modalità telefono negli strumenti
di sviluppo.

### Come app Android

```bash
npm install
npm run android      # build + sync + apre Android Studio
```

Da Android Studio: *Run* sul dispositivo o sull'emulatore. In alternativa, con
l'SDK Android già configurato:

```bash
npm run apk          # produce android/app/build/outputs/apk/debug/app-debug.apk
```

**Requisiti**: Android Studio (o Android SDK + JDK 21) e la variabile
`ANDROID_HOME` impostata.

### Come app iOS

```bash
npm install
npm run ios          # build + sync + apre Xcode
```

Da Xcode: seleziona il tuo team di firma e premi *Run*.

**Requisiti**: macOS, Xcode 15+, CocoaPods.

### Rigenerare icone e splash screen

Sono disegnate proceduralmente e rasterizzate con Chromium:

```bash
node tools/make-icons.cjs
```

---

## Architettura

```
index.html                 pagina unica: canvas + livelli DOM
capacitor.config.json      configurazione dell'app nativa
build.mjs                  copia i file statici in www/ (nessun bundler)

styles/
  main.css                 reset, canvas, joystick, schermata di avvio
  hud.css                  interfaccia in sovrimpressione

src/
  main.js                  avvio: cottura sprite → creazione gioco

  core/                    infrastruttura generica, indipendente dal gioco
    Game.js                orchestratore: collega i sistemi, update e render
    Loop.js                ciclo rAF con dt limitato e pausa in background
    Camera.js              inseguimento morbido, look-ahead, shake
    Input.js               joystick dinamico + tastiera
    EventBus.js            comunicazione fra sistemi senza accoppiamento
    SpatialGrid.js         griglia per culling e ricerche di prossimità
    ObjectPool.js          riciclo oggetti (zero garbage collection)
    MathUtils.js  Rand.js  utility matematiche e random deterministico

  render/                  il "motore grafico"
    Projection.js          proiezione ortografica inclinata (2.5D)
    Mesh.js                mini libreria low-poly (box, cilindro, cono, sfera…)
    SpriteBaker.js         rasterizza una mesh in una sprite
    AssetForge.js          cuoce TUTTE le sprite all'avvio, a rate limitato
    Renderer.js            draw-list ordinata per profondità + blit

  models/                  le mesh del gioco, generate da codice
    character.js           rig animato, parametrico (attrezzi, vestiario)
    nature.js              alberi, cespugli, chiazze di prato, massi, risorse
    buildings.js           capanna, bancarella, banco dell'artigiano…
    village.js             segheria, cava, casa, magazzino e arredi
    town.js                ponte, mulino, fucina, vene di ferro, carri
    city.js                municipio, botteghe, banca, ospedale, fontana, oro
    enemies.js             rig animato del lupo

  world/
    World.js               generazione della mappa e gestione delle entità
    Terrain.js             terreno a pattern + decalcomanie in layer cache
    River.js               il fiume: corso, collisione, guadi e riflessi

  entities/                oggetti del mondo, tutti con update/draw
    Entity.js  Player.js
    TreeEntity.js  RockEntity.js          risorse raccoglibili
    BuildingEntity.js                     cantiere → edificio
    MerchantEntity.js  WorkbenchEntity.js
    NPCEntity.js                          abitanti con routine
    WolfEntity.js                         nemici
    GrowProp.js                           arredi che spuntano dal terreno

  systems/                 meccaniche trasversali
    CarrySystem.js         zaino e catasta ordinata sulla schiena
    PickupSystem.js        risorse a terra e attrazione automatica
    DeliverySystem.js      oggetti che volano verso una destinazione
    ParticleSystem.js      particelle 3D in pool
    FloatingText.js        i numeri che volano
    AudioSystem.js         effetti sonori sintetizzati (nessun file audio)
    Haptics.js             vibrazione nativa (Capacitor) o web
    QualityManager.js      risoluzione adattiva in base agli FPS
    VillageSystem.js       livelli del villaggio ed evoluzione del mondo
    EnemySpawner.js        ondate di nemici, con zone sicure

  ui/
    HUD.js                 indicatori, toast, pannello opzioni (DOM)
    Joystick.js            grafica del joystick (DOM, composto in GPU)
    WorldUI.js             pannelli e frecce disegnati nel mondo

  platform/
    native.js              barra di stato, orientamento, tasto Indietro

  data/                    tutti i numeri e le definizioni, separati dal codice
    config.js  palette.js  buildings.js

tools/                     strumenti di sviluppo (Playwright)
    smoke-test.cjs         verifica end-to-end del ciclo di Fase 1
    phase2-test.cjs        verifica di pietra, cantieri, villaggio, lupi
    phase3-test.cjs        verifica di fiume, ponte, ferro, mulino, strade
    phase4-test.cjs        verifica di oro, città, asfalto, parco, banca
    screenshots.cjs        cattura i momenti chiave
    phase2-shots.cjs       porta la partita a villaggio completo
    perf.cjs               profila il costo del frame
    make-icons.cjs         genera icone e splash
```

### La scelta tecnica centrale: sprite "cotte" da mesh 3D

Il gioco ha un aspetto low-poly con luci e ombre, ma **non usa WebGL**.

La camera ha un'inclinazione fissa e non ruota mai. Questo significa che una
mesh, proiettata sullo schermo, ha sempre lo stesso identico aspetto. Perciò:

1. all'avvio ogni modello viene costruito come vera geometria 3D
   (`models/*.js` → `render/Mesh.js`);
2. viene proiettato, illuminato con shading flat, ordinato per profondità e
   rasterizzato **una volta sola** in un canvas (`SpriteBaker.js`);
3. durante il gioco si esegue solo `drawImage`.

I vantaggi sul telefono sono concreti:

- niente centinaia di poligoni da riempire ogni frame — solo blit;
- niente shader, niente contesto WebGL, niente perdita di contesto;
- i modelli restano **parametrici**: quando compri l'ascia di ferro, il
  personaggio viene ri-cotto in background con la nuova geometria;
- il pacchetto dell'app pesa pochissimo: non c'è **nessun asset grafico**,
  tutto è generato da codice.

Le sprite vengono cotte esattamente alla risoluzione a cui saranno disegnate
(`idealPPU`), così il blit non viene mai riscalato.

Altre scelte pensate per il telefono:

- **object pooling** per particelle, risorse e numeri volanti: nessuna
  allocazione durante il gioco, quindi nessun blocco del garbage collector;
- **griglia spaziale** per disegnare solo ciò che è inquadrato;
- **chiazze di prato**: ciuffi, fiori e sassolini sono pre-composti in un'unica
  sprite, riducendo di 5-8 volte il numero di disegni per frame;
- **layer delle decalcomanie in cache**: col paese cresciuto sentieri e strade
  diventano un centinaio e si accavallano sulla piazza; disegnarli ogni frame
  significava riempire lo schermo quattro volte in alpha — di gran lunga la
  voce più cara del frame. Ora finiscono in un unico layer, rigenerato solo
  quando la camera esce dal margine;
- **LOD di simulazione sugli abitanti**: con la città cresciuta sono decine;
  quelli lontani continuano a muoversi verso le loro mete ma saltano
  evitamento e chiacchiere, che nessuno vedrebbe;
- **qualità adattiva**: se gli FPS calano, la risoluzione di rendering scende
  senza cambiare l'aspetto del gioco;
- **audio sintetizzato** con WebAudio: zero file da caricare, e ogni colpo
  d'ascia suona leggermente diverso;
- HUD e joystick sono in **DOM+CSS**, composti dalla GPU: non rubano tempo al
  ciclo di rendering del canvas.

---

## Roadmap

L'architettura è già pronta per crescere: ogni fase aggiunge moduli senza
riscrivere quelli esistenti.

- **Fase 5 — Metropoli**: grattacieli, auto, semafori, tram.
- **Trasversali**: nuovi biomi ai bordi della mappa (montagne, deserto,
  ghiacciaio, vulcano, isole), nemici con IA, combattimento automatico,
  potenziamenti avanzati.

Il motore dell'evoluzione è già in funzione: `VillageSystem` tiene un livello
che sale a ogni costruzione completata, e ogni livello elenca in `STAGES` gli
arredi e gli abitanti che devono comparire. Aggiungere una fase significa
aggiungere voci a quella tabella e i relativi modelli — la logica di crescita,
di comparsa animata e delle routine degli abitanti resta la stessa.

---

## Licenza

MIT
