// Shurpanakha — aranya kanda
// Source: Valmiki, Aranya Kanda, sargas 17-18 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.
VAR shurpanakha_choice = ""

>> scene panchavati style=bharni-earth
>> music forest
>> cast rama:exile at 0.36
>> cast sita:exile at 0.26
>> cast lakshmana:exile at 0.62 face=left
>> prop hut hut at 0.12 scale=0.8
A winter morning at Panchavati. A rakshasi walking by the river sees Rama, and stops.
>> enter shurpanakha from right to 0.5 in 1.4
SHURPANAKHA: I am Shurpanakha, sister of Ravana, and I go where I please. I have chosen you. Leave that thin human girl. Be my husband.
>> prompt How does Rama answer?
* [Tease her: "I am married. But my brother there has no wife with him."]
  ~ shurpanakha_choice = "tease"
  -> tease
* [Refuse her plainly: "I am married, and I am content."]
  ~ shurpanakha_choice = "plain"
  -> plain
-> tease
= tease
RAMA: I have a wife, lady, and you would not like to be the second. But my brother there has no wife with him.
>> move shurpanakha to 0.54 in 0.8
-> lak
-> plain
= plain
RAMA: I am married, and I am content. You must look elsewhere.
SHURPANAKHA: Then the younger one will do.
>> move shurpanakha to 0.54 in 0.8
-> lak
= lak
LAKSHMANA: I am my brother's servant. Would you be a servant's wife? Go back to him. He may yet change his mind.
She looks from one to the other, and understands that she is being laughed at.
SHURPANAKHA: It is her. While she lives you will not look at me.
>> move shurpanakha to 0.32 in 0.5
>> pose shurpanakha swing0
>> pose sita hurt
>> shake 3
>> sound starBell
RAMA: Lakshmana! Stop her. This has gone past a joke.
>> move lakshmana to 0.42 in 0.4
>> pose lakshmana swing1
>> prop veil veil at 0 who=shurpanakha front=true
>> pose shurpanakha hurt
>> sound fail
There is a cry. She covers her face with her cloth and runs, north, toward Janasthana, where her brother Khara keeps an army.
>> exit shurpanakha to right in 0.9
>> prop veil remove
>> pose lakshmana stand
>> pose sita stand
>> music dark
>> sound drum
SITA: She will not come back alone.
-> END
