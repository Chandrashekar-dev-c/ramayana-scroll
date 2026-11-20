// Kaikeyi's Boons — ayodhya kanda
// Source: Valmiki, Ayodhya Kanda, sargas 7-19 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene city
>> music court
>> cast dasharatha at 0.3
>> cast vasishtha at 0.46 face=left
>> cast citizen at 0.66 face=left
>> cast citizen2 at 0.76 face=left scale=0.94
>> cast citizen3 at 0.86 face=left
>> scene city
Years pass. Dasharatha is old, and he has decided.
DASHARATHA: Tomorrow, under the star Pushya, Rama will be made crown prince. Tell the city.
>> pose citizen raise
>> pose citizen2 raise
>> sound bell
Banners go up. Lamps are set on every wall. No one in Ayodhya sleeps.
>> scene chamber clear
>> enter kaikeyi from left to 0.34 in 0.1
>> enter manthara from right to 0.62 in 1.6
From a rooftop the maid Manthara sees the lamps, and learns why. She goes straight to Queen Kaikeyi.
MANTHARA: Get up. You are lying on silk while your ruin is being arranged. Rama is to be crowned tomorrow.
>> pose kaikeyi give
KAIKEYI: Rama! That is the best news you have ever brought me. Here. Take this jewel. I make no difference between him and my own son.
>> pose kaikeyi stand
>> play hold \{"visual":"whisper","from":"manthara","time":7,"hint":"kaikeyi.7","cue":"headVoice","texts":\["kaikeyi.8","kaikeyi.9","kaikeyi.10","kaikeyi.11"\]\}
KAIKEYI: Yes. I see it now. I should have seen it before.
>> pose kaikeyi grieve
>> exit manthara to right nowait
She goes into the chamber of anger, pulls off her ornaments and lies down on the bare floor.
>> enter dasharatha from left to 0.2 in 1.6
>> music dark
DASHARATHA: Who has wronged you? Tell me, and it is undone. I swear it by Rama, who is dearer to me than my life.
>> pose kaikeyi stand
KAIKEYI: You have sworn. Then hear the two boons you owe me. Let Bharata be crowned. Let Rama go to the forest for fourteen years, in bark, with matted hair.
>> pose dasharatha grieve
>> shake 3
The king says nothing at all for a long time. Then he falls.
>> enter rama:prince from left to 0.08 in 1.4
Morning. Rama is sent for. He finds his father unable to speak, and it is Kaikeyi who tells him.
RAMA: Is that all? Then do not grieve, mother. I will go today. A father's word is not a thing his son lets fall.
>> scene chamber colour=false
>> wait 1.2
-> END
