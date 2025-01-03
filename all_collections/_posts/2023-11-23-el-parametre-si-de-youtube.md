---
layout: post
title: El paràmetre si= de Youtube
categories: [privacitat, youtube]
lang: ca
---
  
Quan compartim un vídeo de YouTube a una altra plataforma, l'enllaç que ens dona el dia d'avui és d'aquest estil:
```
https://youtu.be/jNQXAC9IVRw?si=LhUQIzCLubNrfUOj
```

Aquest `si=LhUQIzCLubNrfUOj` no hi era abans! Fa unes setmanes, era així:
```
https://youtu.be/jNQXAC9IVRw
```

 

L'altre dia, una amiga va compartir en un grup de WhatsApp un vídeo que intentava explicar que això és un paràmetre de rastreig, cosa que va obrir un mini debat sobre si era així o no. Com soc molt propens a deixar-me portar per *caus de conill¹* com aquest, vaig decidir fer-hi una ullada.
  
## Petita exploració

Google no té documentació oficial per aquest paràmetre, per tant, no podem saber segur què en fan. (YouTube és de Google) 

Provant, he vist un parell de coses:
- Cada vegada que fas clic a compartir, el paràmetre canvia. Sembla un identificador únic i aleatori. Per exemple, `si=LhUQIzCLubNrfUOj` és segurament un valor únic que correspon al moment precís on jo escrivia aquest article. 
- Si no tens connexió a internet, no es genera l'enllaç.
- Si esborres el paràmetre, el vídeo es reprodueix igualment. És completament innecessari a nivell funcional. 
  
## Què pot estar fent Google amb aquest paràmetre?

Com el `si=` és únic a cada acció de compartir, es pot rastrejar perfectament **qui comparteix, en quin moment del vídeo i a quina hora exacta**.

L'ús que en fan pot ser molt variat. Algunes coses que se m'acudeixen són:
- Estadístiques generals de com es comparteixen els vídeos. Tant pels creadors com per YouTube.
- Formar-se una idea de les preferències de la persona que comparteix. Per millorar la cerca i per "personalitzar" la publicitat.
- Fer-se una idea aproximada de qui es relaciona amb qui. Si obro un link que tu em comparteixes, segurament és perquè ens coneixem.
  
## He de fer alguna cosa al respecte?

"Rastreig" sempre sona molt malament, tot i que en la majoria de casos no és tant greu.

Per sort tenim diferentes maneres de modular-lo al nostre gust:

### Entén com funciona el consentiment en temes de protecció de dades

En principi, si les plataformes respecten les lleis de protecció de dades, només poden processar-les amb el teu consentiment i pels propòsits que t'han explicat i a tu et semblin bé. Per exemple, et pot semblar bé que es faci un perfil teu per millorar la cerca, però no que es comparteixi amb tercers per fer publicitat.
  
Pots llegir més informació sobre aquest tema a la Viquipèdia: [Directiva de Protecció de Dades](https://ca.wikipedia.org/wiki/Directiva_de_Protecci%C3%B3_de_Dades)
  
Si els has donat el consentiment en algun moment, sempre pots configurar-lo [al teu compte de Google](https://myaccount.google.com/data-and-privacy).
  
Si no els has donat consentiment per res que no sigui necessari, és possible que també et rastregin de manera anònima. Per exemple, per saber quants usuaris hi ha a cada país, o quants usuaris comparteixen vídeos. Es considera que aquest tipus de "rastreig" no és intrusiu i no cal que et demanin permís.
  
### Millora la teva higiene de la privacitat
  
Sempre hi ha coses que es poden fer per augmentar les teves garanties de privacitat, com fer servir un navegador que no et rastreja, com [Firefox](https://www.mozilla.org/ca/firefox/new/), o fer servir un bloquejador de publicitat i rastreig, com [uBlock Origin](https://ublockorigin.com/). Una cosa que fan aquestes eines és eliminar aquest tipus de paràmetres dels enllaços.
  
Està ple d'articles a internet amb bàsics sobre "higiene de la privacitat". Però no he trobat res interessant en català. Si t'interessa que en faci un, envia'm un correu a [ei@yoel.cat](mailto:ei@yoel.cat).
  
-----
  
¹ - "cau de conill" és un anglicisme que s'utilitza per referir-se a una cosa que et crida l'atenció i que et fa perdre el temps: un *[rabbit hole](https://www.dictionary.com/e/slang/rabbit-hole/).*
