// The Seven Sala Trees — kishkindha kanda
// Source: Valmiki, Kishkindha Kanda, sargas 11-12 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene kishkindha style=bharni-earth
>> music vanara
>> cast rama:exile at 0.18
>> cast sugriva at 0.08
>> prop bones skeleton at 0.5 raw=true
SUGRIVA: Forgive me. I believe you mean it. But look: that is the body of the buffalo-demon Dundubhi. Vali killed him with his hands and threw him a full league.
>> move rama to 0.36 in 1.2
>> play tapSpots \{"hint":"sala.2","spots":\[\{"at":0.5,"y":40,"r":110,"cue":"thud","ops":\[\{"do":"prop","id":"bones","remove":true\},\{"do":"pose","who":"rama","pose":"kick"\},\{"do":"shake","amount":4\}\]\}\]\}
Rama lifts it with one toe and sends it ten leagues, out of sight.
>> pose rama stand
SUGRIVA: It was fresh when Vali threw it. It is dry now, and light. I am sorry. I have been afraid for a long time.
RAMA: Then choose the test yourself.
SUGRIVA: Those seven sala trees. Vali can shake the leaves off one. Put an arrow through one.
>> move rama to 0.16 in 1
>> play sala \{\}
The arrow goes through all seven, and the hill behind them, and into the earth, and comes back to his quiver.
>> pose sugriva bow
>> pose rama stand
SUGRIVA: I have no more questions.
>> wash
-> END
