import {visitor,dome,tube,pointOnSite} from './scenery.js';

const modulo=(value,n)=>{const remainder=value%n;return remainder<0?remainder+n:remainder;};
const names={
  astronaut:['Luna Luring','Kaptein Knekkebrød','Nova Nysgjerrig','Astro Aksel','Stella Stjernestøv','Professor Plutselig'],
  alien:['Bip Bop','Ziggi Zagg','Frøken Fnis','Plupp','Zorb Zokk','Snurr Snabel'],
  human:['Ada Appelsin','Mio Makrell','Sofie Sving','Leo Luring','Frida Fart','Jonas Jordbær'],
};
const errands={
  astronaut:['Skal hente matpakken. Den flyter visst rundt i feil romskip.','Leter etter en sokk som tok et lite månehopp.',
    'Øver på månevitsen sin: Den er visst helt ute i verdensrommet.','Har telt 17 kratere, men ett av dem var kaffekoppen.',
    'Tester om kakao smaker bedre med utsikt til jorda.','Har fått i oppdrag å vanne en veldig tørst romagurk.'],
  alien:['Er på vei til lunsj. Har bestilt en pizza med ekstra måneost.','Lurer på hvorfor jordboere bare har to øyne.',
    'Leter etter solbrillene sine. Trenger tre par.','Skal kjøpe iskrem med smaken «lilla torsdag».',
    'Har lært å si hei. Øver nå på «brunost».','Prøver å huske hvor romskipet står parkert.'],
  human:['Skal kjøpe en is. Har brukt hele turen på å velge smak.','Har med matpakke til en venn. Håper vennen liker brokkoli.',
    'Er på vei til fotball. Ballen kom visst fram først.','Leter etter biblioteket og et veldig morsomt vitseleksikon.',
    'Teller trær på turen. Må starte på nytt hver gang en fugl sier pip.','Har god tid. En liten oppdagelsestur er også en plan.'],
};

// Stable nicknames are derived from the map and actor, never from profile data.
export function mapCharacterInfo(scene,key) {
  if (typeof key!=='string') return null;
  const index=Number(key.split(':')[1]);
  const actor=key.startsWith('actor:')?scene.ambient?.[index]:null;
  const part=actor?.parts.find(piece=>piece.characterKind)??scene.parts.find(piece=>piece.entity===key);
  if (!actor&&!part) return null;
  const seed=modulo(Math.trunc(scene.seed??0)+index*13+(Number(key.split(':')[2])||0)*7,997);
  if (actor?.parts.some(piece=>piece.animalKind==='dog')) return {name:'Voffert',status:'Byens turkamerat',story:'Leter etter en pinne. Har glemt at pinnen allerede er hjemme.'};
  const person=actor?.kind==='walk'||key.startsWith('resident:')||actor?.footballPlayer;
  if (person) {
    const kind=part?.characterKind??(scene.id==='moon'?'astronaut':'human');
    const pool=names[kind]??names.human,stories=errands[kind]??errands.human;
    return {name:pool[seed%pool.length],status:kind==='alien'?'En venn fra verdensrommet':kind==='astronaut'?'På månebesøk':'På oppdagelsestur',
      story:actor?.footballPlayer?(scene.id==='moon'?'Spiller på laget Månespark. Hjelmen tåler både lange pasninger og dårlige fotballvitser.':'Spiller på laget Elvespark. Trener på pasninger og på å feire et mål uten å snuble.'):stories[seed%stories.length]};
  }
  const lunar=scene.id==='moon';
  const vehicles={
    bus:actor?.lunarBus?['Kraterbussen','Neste stopp: Moon Burger! Sjåføren Bip lover å stoppe ved alle holdeplasser. Nesten alle.']
      :['Buss '+(seed%9+1),'Sjåføren har med niste og en hemmelig spilleliste. Neste stopp kan lukte vafler.'],
    road:lunar?['Rover Rulle','Har seks hjul og én veldig viktig jobb: finne den rundeste månesteinen.']
      :['Den lille bybilen','Er ute på en omvei. Sjåføren er sikker på at dette er en snarvei.'],
    hover:['Svevebil ZOOM-'+(seed%90+10),'Sjåføren er på vei til iskrembaren. Passasjeren håper at «veiarbeid» ikke finnes i lufta.'],
    'offroad-rover':['Krater-Knut','Utforsker kratere og samler stein. Har gitt den fineste steinen navnet «Steinar».'],
    train:['Elveby-ekspressen','Konduktøren teller billetter. Toget teller tunneler. Begge to liker å telle.'],
    monorail:['Måneglideren','Glir mellom stasjonene med astronauter, romvesener og minst én gjenglemt matpakke.'],
    tram:['Palmetrikk nummer '+(seed%5+1),'Ding ding! Her er det lov å ha sand mellom tærne. Kokosnøtter må ha egen billett.'],
    plane:['Flykaptein Sky','Øver på myke landinger. Skyene gir foreløpig terningkast seks.'],
    shuttle:['Romferga Stjerneskudd','Leverer romturister og forsyninger. Piloten har husket tannbørsten denne gangen.'],
    rocket:['Raketten Hoppetussa','Neste stopp: veldig høyt oppe! Mannskapet har sjekket at matboksen er spent fast.'],
    helicopter:['Helikopteret Virvel','Piloten sjekker at alle tak ligger der de skal. Ingen tak har stukket av i dag.'],
    swimmer:['Badegjesten Plask','Prøver å svømme helt uten å bli våt på håret. Det går sånn passe.'],
    jetski:['Vannscooteren Sprut','Er på en liten rundtur. Prøver å tegne en banan i vannet.'],
    boat:['Kaptein Kringle','Speider etter havna. Og etter en kiosk med boller. Helst begge deler.'],
    bird:lunar?['Kartroboten Pip','Fotograferer månen ovenfra. Har tatt 42 bilder av sin egen antenne.']
      :['Fuglen Pip','Leter etter verdens beste sted å sitte. Kanskje taket på det neste bygget?'],
    'football-ball':['Måneballen','Spretter litt høyere enn en vanlig ball. Prøver sitt beste å treffe målet.'],
    coaster:['Berg-og-dal-vognen','Alle om bord har lovet å holde armene inne. Hylene får være utenfor.'],
  };
  const kind=actor?.kind==='train-car'?(lunar?'monorail':'train'):actor?.kind==='helicopter-rotor'?'helicopter':actor?.kind;
  const info=vehicles[kind];
  return info?{name:info[0],status:lunar?'Liv i månebasen':'Liv på kartet',story:info[1]}:null;
}

export function footballMoment(seconds) {
  const t=modulo(seconds,26);
  const player=(i,time)=>i===0?[-2.04+Math.sin(time*.52)*.49,Math.sin(time*.67)*1.12]
    :time>=14&&time<=21?[1.61,.39]:[1.96+Math.sin(time*.46)*.47,-Math.sin(time*.58)*.97];
  const beats=[0,3,6,9,12,14,16.3,19.2,22,26];
  const receivers=[0,1,0,1,0,0,1,1,0,0];
  let j=beats.findIndex(value=>value>t)-1;
  if (j<0) j=beats.length-2;
  const a=beats[j],b=beats[j+1],p=(t-a)/(b-a);
  const start=player(receivers[j],a),end=player(receivers[j+1],b);
  const bump=j===5,stunned=t>=16.3&&t<19.2;
  const ball=[start[0]+(end[0]-start[0])*p,start[1]+(end[1]-start[1])*p];
  const altitude=bump?Math.sin(p*Math.PI*.5)*1.35:stunned?Math.max(.1,1.35*(1-p)**2):.13+Math.sin(Math.PI*p)*.36;
  return {ball:[ball[0],altitude,ball[1]],players:[player(0,t),player(1,t)],stunned,kick:Math.exp(-p*13),receiver:receivers[j]};
}

export function footballActors(plot) {
  const space=plot.kind==='spaceField',level=space?.52:.35;
  const localTime=seconds=>seconds+plot.index*.31;
  const pose=(x,y,z,yaw=0,stride=0)=>{
    const [a,b,c]=pointOnSite([x,y+level,z],plot),turn=plot.yaw+yaw;
    return {x:a,y:b,z:c,cos:Math.cos(turn),sin:Math.sin(turn),stride,rollCos:1,rollSin:0,sound:0};
  };
  const players=[0,1].map(i=>({kind:'walk',footballPlayer:true,
    parts:visitor(space?(i?'alien':'astronaut'):'human',i?'#6b9bbc':'#d48078',i?'#b48466':'#edb78a',false,.83,i+2),
    pose(seconds) {
      const t=localTime(seconds),state=footballMoment(t),[x,z]=state.players[i];
      const yaw=Math.atan2(state.ball[0]-x,state.ball[2]-z);
      const kick=state.receiver===i?state.kick*.42:0;
      const walking=state.stunned&&i===1?0:Math.sin(t*4.8)*.12;
      const result=pose(x,0,z,yaw,walking+kick);
      if (state.stunned&&i===1) { result.rollSin=Math.sin(t*8)*.075;result.rollCos=Math.sqrt(1-result.rollSin**2); }
      return result;
    },
  }));
  const ball={kind:'football-ball',parts:[dome(0,0,.33,.33,.31,'#f5e8cc'),
    tube(0,.157,.11,.045,.10,'#42546c',.10,'z')],pose(seconds){
    const [x,y,z]=footballMoment(localTime(seconds)).ball;
    return pose(x,y,z,seconds*2);
  }};
  const stars={kind:'football-stars',parts:Array.from({length:3},(_,i)=>{
    const a=i*Math.PI*2/3;
    return {shape:'plate',x:Math.cos(a)*.58,y:i*.08,z:Math.sin(a)*.58,w:.31,d:.01,h:.31,color:'#ffe28a',
      profile:Array.from({length:10},(_,j)=>{const angle=j*Math.PI/5, r=j%2?.073:.17;return [Math.sin(angle)*r,Math.cos(angle)*r];})};
  }),pose(seconds){
    const state=footballMoment(localTime(seconds));
    return pose(state.players[1][0],state.stunned?2.05:-540,state.players[1][1],seconds*3.2);
  }};
  return [...players,ball,stars];
}
