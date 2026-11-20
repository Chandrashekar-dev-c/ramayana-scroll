// Lighting Ayodhya — yuddha kanda
// Source: Valmiki, Yuddha Kanda, sargas 122-127 (verify) (later tradition)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene sky
>> music home
>> cast rama:exile at 0.34 pose=sit y=-206 scale=0.75
>> cast sita:exile at 0.42 pose=sit y=-206 scale=0.75
>> cast lakshmana:exile at 0.26 pose=sit y=-206 scale=0.75
>> prop p pushpaka at 0.34 y=-170 raw=true scale=1.2
Fourteen years, to the day. Vibhishana gives them the Pushpaka. It carries them north, and Rama points down.
>> play tapSpots \{"hint":"lighting.2","ordered":true,"linger":0.6,"spots":\[\{"at":0.72,"y":110,"icon":"place","label":"lighting.3","text":"lighting.4"\},\{"at":0.6,"y":60,"icon":"place","label":"lighting.5","text":"lighting.6"\},\{"at":0.76,"y":150,"icon":"place","label":"lighting.7","text":"lighting.8"\},\{"at":0.64,"y":90,"icon":"place","label":"lighting.9","text":"lighting.10"\},\{"at":0.8,"y":60,"icon":"place","label":"lighting.11","text":"lighting.12"\}\]\}
>> scene nandigram clear
>> prop seat sandalsThrone at 0.2 state=0
>> enter hanuman from left to 0.3 in 1
>> enter bharata from right to 0.62 in 0.1
>> set bharata face=-1
Hanuman goes ahead. Bharata had sworn to walk into fire if Rama was a day late. He is thin, and in bark, and has been counting.
HANUMAN: He is at Bharadvaja's hermitage tonight. He will be here tomorrow.
BHARATA: After so long. They say joy comes to a man who lives, if he waits a hundred years. It is true.
>> scene nandigram clear
>> enter rama:exile from left to 0.36 in 1.2 y=0 scale=1
>> enter bharata from right to 0.6 in 1
>> pose bharata carry
Bharata comes out barefoot, with the sandals on his head. He kneels, and puts them on his brother's feet.
>> pose bharata kneel
>> wait 0.8
>> pose bharata stand
>> move rama to 0.48 in 0.8
>> pose rama give
BHARATA: Here is your kingdom. I kept it for you. It is ten times what you left.
>> scene cityNight clear
>> prop p pushpaka at 0.1 y=-400 raw=true scale=0.01
Ayodhya has one night to make ready.
>> play lamps \{\}
>> scene cityNight
>> wash
-> END
