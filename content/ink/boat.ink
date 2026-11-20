// Guha's Boat — ayodhya kanda
// Source: Valmiki, Ayodhya Kanda, sargas 50-52 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene riverbank style=bharni-earth
>> music forest
>> cast guha at 0.72 face=left
>> cast rama:exile at 0.34
>> cast sita:exile at 0.24
>> cast lakshmana:exile at 0.14
Shringaverapura, on the Ganga. Guha, king of the Nishadas, has been Rama's friend since they were young.
>> pose guha give
GUHA: Everything here is yours. Food, beds, boats, my people, me. Rule this place. You will be no less a king.
RAMA: You have given me the one thing I can take, which is your welcome. I have promised to live on what the forest gives.
>> pose guha stand
>> scene tamasa clear
>> prop bed grassBed at 0.3
>> enter rama:exile from left to 0.26 in 0.1
>> set rama pose=sit
>> enter sita:exile from left to 0.36 in 0.1
>> set sita pose=sit
>> enter lakshmana:exile from right to 0.62 in 0.1
>> enter guha from right to 0.76 in 0.1
>> set guha face=-1
>> set lakshmana face=-1
Night. Rama and Sita sleep on cut grass. Lakshmana stands with his bow, and Guha stands with him.
GUHA: He slept on gold and woke to music. Look at him. I have a bed for you too, prince.
LAKSHMANA: How would I sleep, with him lying there? Sit with me. We will talk until it is light.
>> scene riverbank clear
>> enter rama:exile from left to 0.3 in 0.1
>> enter lakshmana:exile from left to 0.2 in 0.1
>> enter sita:exile from left to 0.1 in 0.1
>> enter sumantra from right to 0.74 in 0.6
RAMA: Go back, Sumantra. Tell my father we are well, and that we do not grieve.
>> exit sumantra to right
Guha brings the sap of the banyan. The brothers mat their hair with it, as hermits do.
>> play boat \{\}
>> scene forest clear
>> enter rama:exile from left to 0.5 in 1.4 nowait
>> enter sita:exile from left to 0.38 in 1.6 nowait
>> enter lakshmana:exile from left to 0.62 in 1.2
On the far bank, Guha watches until the trees close behind them.
>> scene riverbank
>> wash
-> END
