// The Council of Ten — aranya kanda, Lanka
// Source: Valmiki, Aranya Kanda, sargas 31-41 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene lankaCourt style=kachni
>> music lanka
>> cast ravana at 0.3 pose=sit y=-70
>> prop throne throne at 0.3
>> title Meanwhile, in Lanka / The Council of Ten
Lanka, across the sea. A city of gold, taken by a king who studied the Vedas, sang to Shiva, and bowed to no one.
>> enter akampana from right to 0.66 in 1
>> pose akampana kneel
AKAMPANA: Janasthana is gone, lord. Khara, Dushana, fourteen thousand. One man did it, on foot. He has a wife. Take her, and he will die of it.
>> scene hermitage clear
>> enter maricha from right to 0.7 in 0.1
>> enter ravana from left to 0.3 in 1.2
Ravana goes to the old rakshasa Maricha, who has lived as a hermit since a boy with a bow threw him into the sea.
MARICHA: Who told you to do this? He is no friend of yours. Go home. Sleep beside your queens. Leave that lion asleep.
For once, Ravana listens. He goes home.
>> scene lankaCourt clear
>> prop throne throne at 0.3
>> enter ravana from left to 0.3 in 0.1
>> set ravana pose=sit y=-70
>> enter shurpanakha from right to 0.64 in 1.2
>> prop veil veil at 0 who=shurpanakha front=true
Then his sister walks into his court with her face covered.
SHURPANAKHA: You sit there, drunk on yourself, and do not know that your own border is ash. What kind of king has no spies?
SHURPANAKHA: Two men did this to me. And there is a woman with them. I have never seen anything like her. She would suit you.
>> prop veil remove
>> exit shurpanakha to right nowait
>> pose ravana stand
>> set ravana y=0
He is alone, and not alone. He has never been alone.
>> heads \{"voices":\["scholar","brother","desire","pride"\],"lines":\{"scholar":"l1.12","brother":"l1.13","desire":"l1.14","pride":"l1.15"\},"then":\{"pride":"p","*":"o"\}\}
-> p
= p
Pride is the loudest. It usually is.
-> go
-> o
= o
He weighs it. And then, as always, pride speaks last.
-> go
= go
>> scene hermitage clear
>> enter maricha from right to 0.7 in 0.1
>> enter ravana from left to 0.34 in 1.2
The Pushpaka sets him down at Maricha's door a second time.
RAVANA: You will become a golden deer and draw him off. I am not asking for counsel.
MARICHA: I see him in every tree. I hear his name in every word that starts with R. I beg you.
RAVANA: Then I will kill you here.
MARICHA: Then I am dead either way. Better by his hand than yours. I will go.
-> END
