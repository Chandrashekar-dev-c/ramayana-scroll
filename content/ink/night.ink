// Lanka by Night — sundara kanda
// Source: Valmiki, Sundara Kanda, sargas 2-13 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene lankaNight style=kachni
>> music lanka-night
>> cast hanuman at 0.2 scale=0.5 mode=colour
He waits for dark, and makes himself the size of a cat.
>> enter lankini from right to 0.66 in 1.2
LANKINI: I am Lanka. I am this city. No one comes in past me, little monkey.
>> move hanuman to 0.54 in 0.6
>> play tapSpots \{"hint":"night.3","spots":\[\{"who":"lankini","y":100,"cue":"thud","ops":\[\{"do":"pose","who":"lankini","pose":"grieve"\},\{"do":"pose","who":"hanuman","pose":"kick"\},\{"do":"shake","amount":4\}\]\}\]\}
LANKINI: Brahma told me: when a monkey strikes you down, know that the end of the rakshasas has come. Go in. Do what you came for.
>> set lankini visible=false
>> pose hanuman stand
>> play stealth \{\}
>> scene lankaCourt clear
>> prop bed bed at 0.6
>> enter mandodari from right to 0.6 in 0.1 y=-30
>> set mandodari pose=sit
>> enter hanuman from left to 0.2 in 1 scale=0.5 colour=true
In the inner palace the king sleeps among his queens. One lies apart, in gold, so beautiful that Hanuman thinks: I have found her.
Then he thinks again. She would not sleep. She would not eat. She would not wear gold in this house. That is Mandodari.
>> scene lankaNight clear
>> enter hanuman from left to 0.4 in 1 scale=0.5 colour=true
>> set hanuman pose=sit
He has looked in every room in Lanka. If she is dead, how can he go back and say so?
HANUMAN: There is a grove I have not searched. Ashoka trees, behind a wall.
-> END
