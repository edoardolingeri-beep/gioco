# 🌳 Villaggio

Gioco mobile (Android / iOS) di raccolta risorse, costruzione ed evoluzione:
si parte soli in una foresta selvaggia e — fase dopo fase — il mondo si
trasforma in una metropoli viva.

Scritto in **HTML, CSS e JavaScript puri** (moduli ES, nessun bundler, nessuna
libreria di gioco) e impacchettato come **app nativa** con Capacitor.

---

## Stato: gioco completo — tutte e 5 le fasi ✅

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

### Fase 5 — La metropoli

| Funzionalità | Stato |
|---|---|
| **Grattacieli** con fasce di vetro e coronamenti | ✅ |
| **Traffico**: auto che circolano, frenano e fanno la coda | ✅ |
| **Semafori** con ciclo verde/giallo/rosso a gruppi opposti | ✅ |
| Le auto **frenano e suonano** per il giocatore, non lo investono | ✅ |
| **Tram** su binari con traversine e rotaie | ✅ |
| **Stazione**, **fabbrica** con ciminiere fumanti, **aeroporto** | ✅ |
| Chioschi, fermate, arredo urbano | ✅ |
| Fino a 54 abitanti distribuiti sui marciapiedi | ✅ |
| 16 potenziamenti, 18 costruzioni, 18 livelli di crescita | ✅ |

### Rifinitura — atmosfera, guida e musica

| Funzionalità | Stato |
|---|---|
| **Ciclo giorno/notte** completo: alba, giorno, tramonto, notte | ✅ |
| **Lampioni, bracieri, finestre e fari** che si accendono davvero | ✅ |
| Ora d'oro dorata all'alba e al tramonto | ✅ |
| **Cartello dell'obiettivo**: dice sempre qual è il prossimo passo | ✅ |
| Frecce ai bordi coerenti con l'obiettivo mostrato | ✅ |
| **Colonna sonora procedurale** che cambia con la fase del mondo | ✅ |
| Musica più sommessa e in tonalità grave durante la notte | ✅ |
| Bilanciamento delle risorse tardive (pietra, ferro, oro) | ✅ |

### Automazione — gli operai e un recinto che si apre da solo

| Funzionalità | Stato |
|---|---|
| **Boscaiolo** e **Minatore**: si assumono pagando alla segheria/cava | ✅ |
| Lavorano da soli — cercano un albero/masso, lo abbattono, tornano | ✅ |
| Si possono assumere fino a 3 operai per mestiere, ognuno costa di più | ✅ |
| Accumulano al cartello (fino a un limite): il giocatore passa a ritirare | ✅ |
| Se il magazzino è pieno l'operaio aspetta lì, carico, senza sprecare nulla | ✅ |
| **Staccionata** ridisegnata: un quadrato, non un cerchio — linee dritte | ✅ |
| **Varchi automatici** (uno per lato): si aprono da soli quando ti avvicini | ✅ |
| Ogni varco ha un sentiero di terra e due lanterne: si vede subito dov'è | ✅ |

Il percorso completo va dalla prima capanna nella radura alla capitale con
l'aeroporto: cinque fasi, ognuna che trasforma il mondo sotto gli occhi di chi
gioca.

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

- **Orientarsi** — sotto gli indicatori c'è sempre una riga con l'obiettivo
  corrente ("Raccogli legno per Capanna", "Vendi al mercante per aprire la
  Segheria") e la sua barra di avanzamento. Le frecce ai bordi dello schermo
  puntano alla stessa cosa.
- **La notte** — il mondo ha un ciclo di cinque minuti. Al tramonto la luce si
  fa dorata, poi scende il blu e si accendono bracieri, lampioni, finestre e
  i fari delle auto. Non ci sono penalità: è atmosfera.
- **Assumere operai** — appena la segheria o la cava sono costruite, lì
  accanto compare un cartello: restaci fermo con abbastanza monete e assumi
  un boscaiolo o un minatore, che da quel momento raccoglie da solo, aiuta i
  cantieri aperti e torna a lavorare senza che tu debba fare nulla. Se ne
  possono assumere fino a tre per mestiere, ognuno più caro del precedente.
- **Il recinto** — attorno al primo villaggio compare una staccionata chiusa,
  con qualche varco: basta avvicinarsi perché quel tratto si apra da solo, e
  si richiude appena te ne vai.

Ogni edificio completato fa **salire di livello il villaggio**: spuntano orti,
panchine, pozzi, bracieri e staccionate, e arrivano nuovi abitanti.

---

## Provarlo subito

### Dal telefono, senza installare niente

Il gioco è pubblicato come sito su GitHub Pages:

**https://edoardolingeri-beep.github.io/gioco/**

Aprilo dal browser del telefono. Funziona esattamente come nell'app: gira a
schermo intero, salva i progressi in locale e si può aggiungere alla schermata
Home ("Aggiungi a Home" su iOS, "Installa app" su Android).

> **Prima volta**: GitHub Pages va acceso una sola volta a mano, in
> *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
> Dopo quel clic, ogni push ripubblica il sito da solo (workflow
> `.github/workflows/pages.yml`); per pubblicare subito senza aspettare un
> push, *Actions → Pubblica su GitHub Pages → Run workflow*.

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
    metro.js               grattacieli, stazione, fabbrica, aeroporto, veicoli
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
    VehicleEntity.js                      auto e tram sul loro percorso
    GrowProp.js                           arredi che spuntano dal terreno
    HireStationEntity.js                  cartello per assumere un operaio
    WorkerEntity.js                       l'operaio: cerca, lavora, consegna
    FenceGateEntity.js                    tratto di staccionata che si apre da solo

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
    TrafficSystem.js       anelli stradali, semafori, auto e tram
    DayNightSystem.js      velo atmosferico e bagliori delle luci
    ObjectiveSystem.js     deduce dal gioco qual è il prossimo passo
    MusicSystem.js         colonna sonora generata nota per nota
    WorkerSystem.js        assunzione operai e dove finisce ciò che raccolgono

  ui/
    HUD.js                 indicatori, toast, pannello opzioni (DOM)
    Joystick.js            grafica del joystick (DOM, composto in GPU)
    WorldUI.js             pannelli e frecce disegnati nel mondo

  platform/
    native.js              barra di stato, orientamento, tasto Indietro

  data/                    tutti i numeri e le definizioni, separati dal codice
    config.js  palette.js  buildings.js  workers.js

tools/                     strumenti di sviluppo (Playwright)
    smoke-test.cjs         verifica end-to-end del ciclo di Fase 1
    phase2-test.cjs        verifica di pietra, cantieri, villaggio, lupi
    phase3-test.cjs        verifica di fiume, ponte, ferro, mulino, strade
    phase4-test.cjs        verifica di oro, città, asfalto, parco, banca
    phase5-test.cjs        verifica di traffico, semafori, tram, metropoli
    daynight-test.cjs      verifica del ciclo del giorno e delle luci
    music-test.cjs         verifica del metronomo e dei temi musicali
    quest-shots.cjs        schermate del cartello dell'obiettivo
    worker-test.cjs        verifica assunzione, lavoro e consegne degli operai
    fence-test.cjs         verifica dei varchi automatici della staccionata
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

### Notte senza illuminazione per pixel

Il ciclo giorno/notte non calcola luci: dipinge. Sopra la scena già disegnata
passano, in quest'ordine,

1. **un velo in `multiply`** che spegne i colori verso il blu della notte (o
   li scalda verso l'arancio all'alba e al tramonto). `multiply` è la scelta
   giusta perché l'erba resta erba, solo più cupa: un velo opaco appiattirebbe
   tutto in una tinta unica;
2. **un soffio additivo** di azzurro lunare, che serve soprattutto a
   desaturare — col solo `multiply` il prato resta verde acceso e la notte
   sembra un pomeriggio nuvoloso;
3. **i bagliori delle sorgenti luminose**, disegnati DOPO il velo: è
   quest'ordine a far sembrare accesi lampioni, bracieri e finestre.

I bagliori finiscono prima in un buffer con `lighten` — che tiene il massimo
canale per canale, non la somma — e solo dopo vanno sulla scena. Sommandoli
direttamente, una piazza con dieci lampioni tornava luminosa quanto di giorno:
misurato, 122 su 255 di media contro i 117 del mezzogiorno. Col massimo la
stessa piazza sta a 83, illuminata a chiazze come dev'essere.

Il costo è di due riempimenti di schermo e una manciata di blit, e di giorno
il sistema esce subito senza disegnare nulla.

### Musica generata, non riprodotta

Come gli effetti, la colonna sonora è sintetizzata con WebAudio: zero byte di
download e — soprattutto — la possibilità di **cambiare con il mondo**. Ogni
fase ha il suo tema (arpa rada nella foresta, basso e battito nella
metropoli), il cambio avviene a inizio battuta e di notte le voci scendono
d'ottava e di volume.

Il tempo lo tiene la timeline dell'AudioContext, non il game loop: le note
vengono programmate con 0,7 secondi di anticipo, quindi restano a tempo anche
se il frame rate balla.

### Un operaio accumula, non consegna

La prima versione faceva consegnare il raccolto direttamente ai cantieri (o
lo vendeva se non serviva a nessuno): comodo, ma toglieva al giocatore
l'unica cosa che rende soddisfacente ogni altra raccolta nel gioco — vedere
lo zaino riempirsi e portarlo da qualche parte con le proprie gambe. Ora
l'operaio si ferma un passo prima:

1. cerca l'albero o il masso raccoglibile più vicino al suo cartello;
2. ci cammina vicino e "lavora" per qualche secondo, con gli stessi chip e
   suoni del colpo del giocatore;
3. allo scadere, l'albero cade (o il masso si sbriciola) **in silenzio** —
   `TreeEntity.fell`/`RockEntity.shatter` accettano un flag che salta la
   generazione dei tronchi a terra, perché l'operaio se li porta già "in
   spalla" — e torna al cartello;
4. lì deposita nel **magazzino del cartello** (`HireStationEntity.stock`,
   fino a un tetto). Se il giocatore non è passato da un po' e il magazzino
   è pieno, l'operaio resta fermo lì con il carico ancora in spalla —
   nessuno spreco, ma il messaggio è chiaro: serve una visita.

Il giocatore, entrando nella zona del cartello, si vede travasare la scorta
nello zaino a raffica — la stessa cadenza (`CFG.deliver.interval`) e lo
stesso volo con `DeliverySystem` usati per ogni altra consegna — e da lì in
poi la risorsa è sua, da portare a un cantiere o al mercante come se
l'avesse raccolta a mano. Il nastro trasportatore (vedi sotto) automatizza
anche quest'ultimo tratto, per chi ha portato l'operaio fino in fondo alla
sua progressione.

Il cartello compare vicino all'edificio che lo sblocca (`offX`/`offZ` in
`data/workers.js`), spostato verso il centro del villaggio e non verso il
bosco o la cava: appena il recinto compare, il magazzino da ritirare resta
dentro le mura invece di trovarsi appena fuori da un cancello.

### Un negozio comprabile da ovunque, non solo un banco nel mondo

Ogni altro potenziamento del gioco è un pannello sul posto — ti avvicini,
resti fermo un istante, comprato. Per zaino/armi/personaggio funziona bene
perché il banco dell'artigiano (`WorkbenchEntity`) è comunque una tappa
naturale del percorso. Per gli operai no: il boscaiolo porta sempre lo
stesso carico per consegna e il cartello si riempie sempre alla stessa
capienza, due numeri che è comodo poter aggiustare in corsa, magari mentre
sei dall'altra parte della mappa.

Il pulsante 🛒 in HUD apre un pannello a schermo con l'elenco di ciò che si
può comprare in questo momento: il prossimo potenziamento del personaggio
(la stessa coda in `UPGRADES`, config.js) più, per ogni operaio già
assunto, due leve indipendenti — `yield` (quanta risorsa porta a ogni
consegna) e `capacity` (la capienza del magazzino) — definite in
`data/workers.js` e gestite da `WorkerSystem.buyUpgrade`. Ogni riga mostra
il livello attuale ("Lv 3/10"): dieci gradini per leva, ognuno più caro del
precedente (`cost × growth^livelliGiàComprati`). `WorkbenchEntity.buy()` è
lo stesso metodo chiamato sia dal banco fisico sia dal pulsante: un solo
percorso d'acquisto, due modi di arrivarci.

**Il nastro trasportatore** è il traguardo in fondo a quella progressione,
non una tappa come le altre: compare nel negozio solo quando resa e
magazzino di un operaio sono *entrambi* già al livello massimo
(`WorkerSystem.conveyorReady`), costa una cifra pensata per essere l'ultimo
grande acquisto di quell'operaio, e una volta comprato (`buyConveyor`)
cambia comportamento al cartello: `HireStationEntity` smette di aspettare
che il giocatore passi a ritirare e vende da sé la scorta, a intervalli,
convertendola in monete con lo stesso prezzo del mercante
(`CFG.economy.prices × sellBonus`) — funziona anche dall'altra parte della
mappa. L'unica concessione a chi è lì vicino per caso è il suono: la moneta
tintinna solo se il giocatore è a meno di 15 unità, altrimenti resta muto —
lo stesso motivo per cui, dalla scorsa modifica, anche il colpo di
boscaioli e minatori tace se sei lontano: un reddito passivo non deve
sentirsi ovunque sulla mappa.

**Ogni risorsa ha il suo operaio**, non solo legno e pietra: il minatore di
ferro (fucina) e il cercatore d'oro (banca) seguono la stessa `WorkerSystem`
generica di boscaiolo e minatore — stesse due leve, stesso nastro
trasportatore, stesso tutto. L'unica differenza reale è dove compare il
cartello: ferro e oro si trovano solo ben oltre il fiume (`World.js`), così
lontano dalla fucina e dalla banca (che restano a sud) che un cartello
accanto all'edificio non avrebbe mai raggiunto una vena. Per questi due,
`WORKER_TYPES` usa una posizione fissa nella zona giusta (`stationSpot`)
invece dell'offset dall'edificio (`offX`/`offZ`) usato da boscaiolo e
minatore — `WorkerSystem.registerStation` sceglie l'uno o l'altro a seconda
di quale il tipo di operaio definisce.

Le descrizioni nel pannello del negozio vanno a capo invece di troncarsi
con i puntini di sospensione — con cinque operai anziché due, e un testo
non sempre breve ("Il cartello accumula di più prima di riempirsi"),
tagliarle a mezza frase le rendeva illeggibili.

### Il "nuovo pozzo": un secondo traguardo dopo il nastro

Il nastro trasportatore non è più l'ultima parola su un operaio: dopo
averlo installato, il negozio offre un secondo acquisto — il "nuovo pozzo"
(`WorkerSystem.buyPit2`, dati in `WORKER_TYPES[id].pit2`) — che raddoppia
per sempre la resa di quell'operaio. È un traguardo sopra il traguardo,
apposta: comprarlo prima del nastro non avrebbe senso (raddoppiare una
resa che il giocatore deve ancora venire a ritirare a mano non si sente),
quindi `pit2Ready` richiede `hasConveyor` come precondizione.

Nel pannello del negozio, sia il manager (nastro) sia il nuovo pozzo
condividono lo stesso trattamento grafico — una card con bordo dorato e
un'etichetta ("MANAGER"/"POZZO") invece della solita riga — per farli
risaltare come i due traguardi che sono, non come un potenziamento
qualunque.

### Il pescatore: un operaio "stanziale"

Il pesce è la quinta risorsa, e il pescatore (sbloccato dal ponte) il suo
operaio — ma con una differenza rispetto agli altri quattro: non cerca né
trasporta nulla. Aggiungere una risorsa legata al fiume nello stesso modo
di legno/pietra/ferro/oro avrebbe richiesto disegnare (e cuocere) una
sprite apposta per ogni "punto pesca" lungo la riva; invece, `WorkerEntity`
supporta un flag `stationary` (solo il pescatore lo usa, per ora): appena
assunto, l'operaio nasce già al suo molo — un passo più vicino all'acqua
rispetto al cartello (`dockOffX`/`dockOffZ`) — e ci pesca per sempre,
saltando del tutto gli stati SEEK/WALK/RETURN e depositando direttamente
al cartello (`WorkerEntity._workStationary`). Stesse due leve, stesso
nastro, stesso nuovo pozzo degli altri operai: cambia solo *come* lavora,
non *cosa* si può comprare per lui.

Il cartello sta sulla sponda SUD del fiume, vicino al ponte ma senza
bisogno che sia già attraversabile: il pesce, a differenza di ferro e oro,
non è una ricompensa per il ponte — è un modo per dargli anche un secondo
motivo di esistere (sblocca il pescatore, oltre alla sponda nord).

Da fermo e in silenzio, il pescatore rischiava di sembrare un operaio che
"non fa nulla" — a differenza di boscaiolo e minatore, che si vedono
camminare e colpire. `WorkerEntity._workStationary` ora dà un riscontro
anche a metà ciclo, non solo alla fine: una spruzzata sull'acqua (e un
suono, se sei vicino) mentre aspetta l'abboccata, e un "+N 🐟" ben visibile
a ogni consegna — lo stesso genere di riscontro che gli altri operai hanno
già dal colpo che si sente e si vede.

### Eventi casuali: qualcosa che non hai chiesto tu

`EventSystem` (attivo appena nasce il villaggio, come `EnemySpawner`)
sceglie ogni tanto — a intervalli irregolari, mai troppo ravvicinati — uno
tra due piccoli imprevisti:

- **Carro rovesciato**: qualche risorsa gratis appare a terra vicino al
  giocatore (`PickupSystem.spawn`, stesso sistema di raccolta di sempre).
- **Lupo feroce**: una scelta vera, mostrata in un pannello che resta
  finché non si decide (`HUD.showEvent`) — affrontarlo fa comparire un
  `WolfEntity` più grande e con più vita, la cui morte paga una ricompensa
  moltiplicata (`rewardMul`, letto da `Game`'s `enemy:killed`); evitarlo
  non fa succedere nulla. Compare solo dopo che il giocatore ha già ucciso
  almeno un nemico, altrimenti rischierebbe di presentarsi prima che sappia
  difendersi.

C'era anche un terzo evento, "il mercante paga di più per un po'": tolto
perché confondeva più che aiutare — un bonus a tempo che scade da solo,
senza un motivo visibile per cui il prezzo è cambiato, non si capiva.

Nessun evento scatta se negozio o opzioni sono già aperti: il timer si
limita a riprovare tra poco, invece di sovrapporsi a un altro pannello.

### Il villaggio autosufficiente: si vende da solo quel che non serve più

Il nastro trasportatore (sopra) richiede un traguardo lungo — resa e
magazzino al livello massimo, poi una spesa importante. Ma c'è un caso più
semplice e più comune: una risorsa che il giocatore ha smesso di portare a
mano non perché ha comprato qualcosa, ma perché **non gli serve più** —
tutti i cantieri che la richiedevano sono già finiti. `WorkerSystem.
resourceStillNeeded(resource)` guarda i cantieri già sbloccati (`available`)
e non ancora finiti in `BUILD_ORDER`: se nessuno di questi costa più quella
risorsa, il cartello inizia a venderla da solo — stesso meccanismo del
nastro (`HireStationEntity._autoSell`), ma gratis, e senza aspettare che il
giocatore compri niente.

Guarda solo i cantieri *già visibili*, non l'intero albero futuro: se più
avanti un edificio tornerà ad averne bisogno (il legno, per esempio, serve
di nuovo per la stazione in Fase 5, dopo un tratto senza), la funzione
torna vera da sola non appena quel cantiere si sblocca, e il cartello
smette di vendere per lasciare che la scorta si riaccumuli in tempo —
nessuna cache permanente, si ricalcola (con una cache invalidata a ogni
`building:done`, per non rifare il giro di 19 edifici a ogni frame) ogni
volta che qualcosa di rilevante cambia.

Il pesce è un caso particolare, non uno speciale: nessun cantiere lo
richiede mai, quindi `resourceStillNeeded('fish')` è falso fin dal primo
giorno — il pescatore vende da solo da subito, coerente con l'essere
l'unico operaio pensato come reddito passivo puro (vedi sopra). Il "nuovo
pozzo" resta comunque legato al livello massimo di resa/magazzino
(`conveyorReady`), per tutti e cinque gli operai allo stesso modo: cambia
solo se serve *anche* comprare il nastro per sbloccarlo, o se la scorta si
vende già da sola.

### Un bonus per ogni edificio

Alcuni edifici (municipio, parco, la seconda torre) alzavano solo il
livello del villaggio senza dare nessun numero in cambio — costruirli si
sentiva come un passo avanti nella storia, non nel gioco. Ora ognuno ha un
effetto vero: il municipio rende una piccola rendita (le tasse comunali),
il parco allarga i magazzini, la torre panoramica alza il moltiplicatore
di vendita generale.

La banca aveva già un effetto (rendita + oro estratto in più), ma era
facile non accorgersene: ora dà anche un bonus di vendita specifico
sull'oro (`stats.goldSellBonus`, si somma a `sellBonus` solo quando si
vende oro — `sellPrice()` in `data/config.js`), così un edificio pensato
per l'oro rende visibilmente di più proprio sull'oro, non solo un +8 di
rendita generica facile da perdere nel resto dei numeri.

### Meno gente, meno carretti

Il tetto di abitanti (`CFG.npc.maxCount`) era già stato abbassato una volta
questa sessione (54 → 40); non bastava. Ora è 28, e soprattutto i
carrettieri — che si sommano ai normali abitanti fase dopo fase, senza mai
diminuire — sono stati dimezzati per ogni fase (`haulers` in `VillageSystem`
STAGES): a fine partita erano un terzo della popolazione, tutti carretti
per strada, ed erano quello che si notava di più nel "casino". La
probabilità che un abitante scelga di sedersi invece di girovagare è salita
dal 55% al 68%: più gente ferma, meno gente per strada nello stesso istante.

La prima versione era un anello di 44 tratti, ognuno orientato con la sprite
cotta più vicina fra le 12 disponibili (`FENCE_DIRS`): con un angolo ogni
30°, l'errore di arrotondamento si vedeva — il recinto sembrava storto e
spezzato invece che una linea pulita. Un quadrato non ha questo problema: i
quattro lati sono perfettamente orizzontali o verticali, cioè esattamente
due dei dodici orientamenti già cotti — zero arrotondamento, zero errore,
qualunque sia la lunghezza del lato. I segmenti si sovrappongono leggermente
fra loro, così non si vede mai una fessura.

Un varco per lato, sempre nello stesso punto e ben marcato — arco, sentiero
di terra battuta e due lanterne che di notte lo rendono il punto più
luminoso del perimetro — si apre da solo: i tratti sotto il cancelletto sono
entità a parte (`FenceGateEntity`) che sprofondano nel terreno quando il
giocatore entra nel loro raggio e risalgono quando se ne va, ridiventando
solidi solo a metà chiusura per non respingerlo mentre sta ancora passando.
Nessuna sprite di un cancello che si apre — il motore non anima mesh dal
vivo — solo scala, trasparenza e un offset verticale sulla sprite già cotta,
più una nuvoletta di polvere a ogni cambio di stato.

Il cancello non guarda solo il giocatore: si apre per chiunque porti il
segno `opensGates` (`Player`, `NPCEntity`, `WorkerEntity`), verificato con
una query sulla griglia spaziale attorno al varco invece che sulla sola
posizione di `game.player`. Senza, gli abitanti che nascono fuori dal
recinto (così si vedono arrivare) restavano a correre contro un tratto
chiuso per sempre — il cancello si apriva solo quando arrivavi tu. Per
farceli davvero entrare, `NPCEntity._go()` riconosce quando è fuori dal
recinto con una meta al suo interno e punta prima al centro del varco più
vicino (`VillageSystem.gateCenters`), passando alla meta reale solo una
volta dentro.

L'arco del cancello, però, era cotto in un solo orientamento e riusato su
tutti e quattro i lati: su quelli verticali (est/ovest) restava disegnato
per traverso sopra una staccionata quasi di taglio, un incrocio senza
senso. Ora `AssetForge` cuoce anche l'arco in due orientamenti, come la
staccionata stessa, e `_buildFenceRing` sceglie quello giusto per lato. La
staccionata "di taglio" aveva un problema simile ma più sottile: vista
quasi di profilo dalla telecamera fissa, le traverse sottili sparivano
quasi del tutto, lasciando solo i cappelli a punta dei pali — una fila di
rombi staccati, non un recinto. Il modello (`buildFence` in
`models/village.js`) ha ora traverse e pali intermedi più spessi apposta:
restano leggeri visti di fronte, non svaniscono più visti di taglio.

### Un villaggio che non si affolla, e non si vende per sbaglio

Tre correzioni collegate, tutte sulla stessa lamentela: "c'è troppa roba in
mezzo, e uscendo vendo cose per sbaglio".

Il mercante e il banco dell'artigiano erano piazzati vicinissimi a un
cancello (il mercante a 1.9 unità da quello a est, il banco a 1.2 da quello
a sud) — uscendo dal recinto si finiva dentro la loro zona d'azione e si
vendeva o si spendeva solo passando di lì. Spostati entrambi a più di 5
unità da ogni cancello: la somma dei due raggi d'azione (quello del varco
per aprirsi, quello del mercante o del banco per attivarsi) non arriva mai
a coprire lo stesso punto, quindi non possono più scattare insieme.

La staccionata, quando compare (o si allarga, vedi sotto), toglie dal suo
interno alberi e vegetazione spontanea nati lì per la generazione casuale
della mappa (`VillageSystem._clearFlora`) — un albero che rispunta in mezzo
al passaggio, magari ricresciuto da un ceppo dopo che un operaio l'ha
abbattuto, non si legge come natura che entra nel villaggio, si legge come
un intoppo. Non tocca niente che sia stato messo lì apposta (edifici,
arredi, cartelli): solo `TreeEntity`, `RockEntity` e le decorazioni
marcate `natural` (cespugli, sassi, ciuffi, fiori — tutto ciò che
`World.js` sparge a caso all'avvio).

**Allargare il villaggio** è la risposta a "troppa roba, poco spazio": una
voce del negozio (🏗️, compare solo mentre il recinto esiste) che ogni volta
sposta il perimetro un po' più in là — fino a un tetto di tre allargamenti
— a un costo crescente. `VillageSystem.expand()` fa sparire il vecchio
anello all'istante e fa salire il nuovo con la stessa animazione di un
livello normale, ripete la stessa pulizia di alberi vista sopra sulla
fascia appena inglobata, e persino la zona sicura dei nemici
(`EnemySpawner`) segue il recinto invece di restare ferma alla misura
base — allargare le mura non deve far comparire un lupo dentro casa.
Il recinto resta comunque legato alla fase "villaggio": quando il Municipio
fa scattare la fase "Città" (`stage.removeFence`), la staccionata si smonta
lo stesso, allargata o no — è voluto (`_removeFence`, la città ha superato
il vecchio perimetro), non un effetto collaterale dell'allargamento.

I pannelli sopra edifici, cartelli, banco e mercante compaiono già da un
bel po' di distanza (il margine oltre la loro `zone` di interazione), pensato
per un villaggio con poche cose vicine fra loro. Con più cartelli, cantieri
e arredi ravvicinati (specie dopo aver assunto operai per ogni risorsa, vedi
sotto) più pannelli finivano visibili insieme, accavallati — si legge come
confusione, non come informazione. Il margine è più stretto ora (da +6/+5.5
a +3 unità in `BuildingEntity`, `WorkbenchEntity`, `MerchantEntity`,
`HireStationEntity`): i pannelli continuano a comparire dolcemente
avvicinandosi, solo da più vicino.

### Operai che aspettano invece di sembrare bloccati, e strade meno affollate

Due lamentele diverse, radice simile: "a volte sembrano bloccati" (gli
operai) e "troppa gente per strada" (gli abitanti) — in entrambi i casi
qualcuno stava correttamente *aspettando*, ma niente lo comunicava.

Spostare il cartello di boscaiolo e minatore verso il centro del villaggio
(vedi sopra, contro l'uscire dal cancello per sbaglio) li aveva anche
allontanati dal bosco e dalla cava vera e propria: lo stesso raggio di
lavoro copriva meno alberi/massi di prima, quindi capitava più spesso che
un operaio restasse fermo ad aspettare che qualcosa ricrescesse nel suo
raggio — non bloccato, ma sembrava tale. Il raggio di boscaiolo e minatore
è più largo apposta (13 → 17) per compensare lo spostamento.

Gli abitanti, invece, sceglievano una nuova meta a caso ogni 4-9 secondi
qualunque fosse l'attività appena finita: il risultato era una popolazione
quasi sempre in cammino da qualche parte, che con `maxCount` a 54 si legge
come una strada perennemente affollata. Tre correzioni:
- `NPCEntity._pickActivity` preferisce ora una panchina libera quando c'è,
  e chi si siede ci resta molto più a lungo (16-30s contro i 4-9 di prima)
  — un abitante seduto non è "per strada".
- Ogni punto di interesse tiene un `occupiedBy`, così due abitanti non
  puntano mai alla stessa panchina: prima capitava, e uno dei due finiva
  "invisibilmente" sovrapposto all'altro. Se in un dato momento tutti i
  punti liberi sono occupati, l'abitante si ferma lì dov'è per un attimo
  invece di rubare il posto a chi lo sta già usando.
- `CFG.npc.maxCount` è sceso da 54 a 40.

Il gioco non ha spazi interni (è un motore 2.5D solo esterni): "farli
entrare in casa" non è modellabile senza una nuova meccanica apposta —
farli sedere più a lungo, con meno persone in giro, è la versione
raggiungibile della stessa idea.

### Un secondo nemico, e la prima difesa che non serve azionare

Il lupo per un po' è stato l'unico pericolo del gioco. Due aggiunte, pensate
insieme: un nemico più tosto da incontrare, e un modo per difendersi che non
richiede di correre ovunque a menare fendenti.

**L'orso** (`BearEntity.js`) usa la stessa macchina a stati del lupo —
VAGA → INSEGUE → ATTACCA → ARRETRA, lo stesso rig procedurale a quattro
zampe (`models/enemies.js`) — ma tutt'altro carattere: corpo tozzo invece
che filiforme, passo pesante e più lento, un colpo che fa quasi il doppio
del danno e un'animazione d'attacco più lunga apposta, perché si faccia in
tempo a leggerla e scansarsi. Vale molte più monete se abbattuto. Compare
solo dopo che il villaggio è già "Villaggio" (`bearMinLevel`), e anche
allora resta l'eccezione: la maggior parte delle ondate (`EnemySpawner`)
è comunque di lupi, ora anche un po' più frequenti di prima.

**La torretta di guardia** (`TowerEntity.js`, cantiere `guardTower`) è il
primo edificio che non "si spegne" da finito: ogni altro cantiere, una
volta completo, esce dalla lista degli aggiornamenti e torna a costare
quanto un arredo statico (`BuildingEntity.update`, per chi c'è dietro).
La torretta continua a cercare, ogni frame, il lupo o l'orso più vicino
nel suo raggio e gli spara da sola, a intervalli — nessun tocco del
giocatore richiesto, difende anche mentre sei dall'altra parte della
mappa. Per il resto è un cantiere come tutti gli altri (si paga in
risorse, sale con la stessa animazione): eredita da `BuildingEntity` e
aggiunge solo il comportamento di combattimento.

---

## Roadmap

Il gioco copre l'intero arco previsto: dalla foresta selvaggia alla metropoli.
Ogni fase ha aggiunto moduli senza riscrivere quelli esistenti, e i salvataggi
sono rimasti compatibili dalla prima all'ultima.

Le cinque fasi previste sono completate. Gli sviluppi naturali da qui:

- **Nuovi biomi** ai bordi della mappa: montagne, deserto, ghiacciaio,
  vulcano, isole, ognuno con materiali, animali e costruzioni esclusive.
- **Villaggi rivali**: incursioni vere e proprie invece dei soli animali
  selvatici — la torretta di guardia è già lì ad aspettarle.
- **Altri nemici** (goblin, scheletri) con comportamenti diversi dal lupo
  e dall'orso: chi ruba e scappa, chi attacca in gruppo.
- **Porto e navi**, sfruttando il sistema di percorsi già usato per il tram.
- **Meteo**: pioggia e neve, con lo stesso schema a veli usato dalla notte.
- **Selettore x1/x10/xMax** nel negozio, per comprare più livelli di
  potenziamento in un colpo solo invece di premere dieci volte.
- **Città a griglia**: oggi ogni edificio ha una posizione fissata a mano
  (`spot` in `data/buildings.js`) e le strade sono raggi che partono dal
  centro verso ciascuno (`VillageSystem._paveRoads`/`_paveAsphalt`) — non
  un reticolo. Rifarlo bene (strade dritte, edifici allineati) tocca le
  posizioni di tutti e 19 gli edifici, il disegno delle strade in ogni
  fase, l'anello del traffico (Fase 5) e ogni punto d'interesse degli
  abitanti agganciato a un edificio: un lavoro a parte, non una modifica
  al margine.

Il motore dell'evoluzione è già in funzione: `VillageSystem` tiene un livello
che sale a ogni costruzione completata, e ogni livello elenca in `STAGES` gli
arredi e gli abitanti che devono comparire. Aggiungere una fase significa
aggiungere voci a quella tabella e i relativi modelli — la logica di crescita,
di comparsa animata e delle routine degli abitanti resta la stessa.

---

## Licenza

MIT
