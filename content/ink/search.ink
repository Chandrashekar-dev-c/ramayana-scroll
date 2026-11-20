// The Search — kishkindha kanda
// Source: Valmiki, Kishkindha Kanda, sargas 27-67 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene cave style=bharni-earth
>> music rain
>> cast rama:exile at 0.4 pose=sit
>> cast lakshmana:exile at 0.56 face=left
The rains come. No army can move. Rama waits in a cave on Mount Prasravana and watches the water fall.
>> play hold \{"visual":"seasons","time":8,"hint":"search.2","cue":"bellSoft","texts":\["search.3","search.4","search.5","search.6"\]\}
>> scene kishkindha clear
>> music vanara
>> enter tara from right to 0.66 in 0.1
>> enter lakshmana:exile from left to 0.3 in 0.8
>> set lakshmana pose=draw1
Autumn, and no word from Kishkindha. Lakshmana goes down with his bow strung. It is Tara who comes out to meet him.
TARA: He has been drunk on being safe. He is not false. The armies were sent for ten days ago. Come in and see.
>> pose lakshmana stand
>> scene kishkindha clear
>> enter sugriva from left to 0.2 in 0.1
>> enter rama:exile from left to 0.36 in 0.1
>> enter hanuman from right to 0.6 in 0.1
>> enter angada from right to 0.74 in 0.1
>> enter jambavan from right to 0.88 in 0.1
They come in their millions. Sugriva sends them east, west, north and south, with one month to search.
>> pose rama give
>> prop ring ring at 0.48 y=-120 raw=true front=true
RAMA: Hanuman. I think it will be you. Take my ring. She will know it, and she will know you came from me.
>> prop ring remove
>> pose rama stand
>> pose hanuman namaste
>> scene cave clear
>> enter angada from left to 0.2 in 0.1
>> enter hanuman from left to 0.32 in 0.1
>> enter jambavan from left to 0.1 in 0.1
The southern party finds nothing. Thirsty, they follow wet birds into a cave, and are lost in the dark.
>> play tapSpots \{"hint":"search.12","ordered":true,"linger":0.4,"spots":\[\{"at":0.44,"y":140,"icon":"herb"\},\{"at":0.56,"y":260,"icon":"herb"\},\{"at":0.68,"y":160,"icon":"herb"\},\{"at":0.8,"y":240,"icon":"herb"\}\]\}
>> enter svayamprabha from right to 0.84 in 1
SVAYAMPRABHA: No one who enters this cave leaves it alive. But you are on a good errand. Eat. Then close your eyes, and I will set you outside.
>> scene shore clear
>> music dark
>> enter angada from left to 0.3 in 0.1
>> enter hanuman from left to 0.44 in 0.1
>> enter jambavan from left to 0.16 in 0.1
>> set angada pose=sit
>> set hanuman pose=sit
They open their eyes on the southern shore. The month is over. The sea is in front of them.
ANGADA: Sugriva will kill us for coming back with nothing. Let us sit here and fast until we die. Jatayu died better than this, fighting for her.
>> enter sampati from right to 0.78 in 1.6
_: Who speaks of Jatayu? Who says my brother is dead?
SAMPATI: I am Sampati. I burned my wings shielding him from the sun when we were young. I cannot fly, but I can still see. She is in Lanka, a hundred yojanas over that water, in a garden, weeping.
>> pose angada stand
>> music vanara
ANGADA: I can leap a hundred yojanas. I am not sure I can leap back.
JAMBAVAN: Hanuman, why are you sitting there saying nothing? You are the son of the Wind. As a child you jumped at the sun, taking it for a fruit. You were cursed to forget your strength until someone reminded you. I am reminding you.
>> pose hanuman stand
>> play hold \{"who":"hanuman","visual":"grow","scale":2.4,"time":3.2,"hint":"search.21"\}
HANUMAN: I could carry Lanka back by its roots. Wait here for me.
>> wash
-> END
