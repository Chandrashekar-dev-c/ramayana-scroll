// The Sage at the Gate — Bala Kanda
// Source: Valmiki, Bala Kanda, sargas 18-22 (verify)
// Staged for the Ramlila stage.
VAR sage_choice = ""

>> scene court
>> prop throne throne at 0.34
>> cast dasharatha at 0.34 pose=sit y=-56
>> cast vasishtha at 0.5 face=left
>> cast shatrughna at 0.02
>> cast bharata at 0.08 scale=0.94
>> cast lakshmana:prince at 0.14
>> cast rama:prince at 0.21
Ayodhya, on the river Sarayu. King Dasharatha sits in his court, his four sons beside him.
>> sound bellLow
A guard runs in. The sage Vishvamitra is at the gate.
>> pose vasishtha namaste
>> enter vishvamitra from right to 0.78 in 2.4
>> pose vasishtha stand
>> pose dasharatha namaste
DASHARATHA: Great sage, your coming is like rain on a dry field. Ask, and it is yours.
>> pose vishvamitra point
VISHVAMITRA: I am holding a sacrifice. Two rakshasas, Maricha and Subahu, foul the altar each time.
>> pose vishvamitra stand
VISHVAMITRA: Give me your eldest son, Rama, for ten nights. He will guard it.
>> pose dasharatha sit
>> prompt How does the king answer?
* ["He is only a boy. Take my army instead."]
  ~ sage_choice = "boy"
  -> boy
* ["Take him, with my blessing."]
  ~ sage_choice = "blessing"
  -> bless

= boy
>> pose dasharatha raise
DASHARATHA: He is not yet sixteen. He has never seen a battle. I will come myself, with every soldier I have.
>> pose dasharatha sit
>> pose vishvamitra point
>> shake 4
>> sound bellLow
VISHVAMITRA: You gave your word and now you take it back. That is not the way of your house.
>> move vasishtha to 0.44
>> pose vasishtha give
VASISHTHA: Keep your promise, my king. This sage knows every weapon the gods have made. Rama will be safer with him than here.
>> pose vasishtha stand
>> pose dasharatha namaste
DASHARATHA: Then I was wrong to be afraid.
-> go

= bless
>> pose dasharatha give
DASHARATHA: It is hard to say, and I will say it. Take him, with my blessing.
>> pose vasishtha namaste
VASISHTHA: Well spoken. This sage knows every weapon the gods have made. No harm will come to the boy.
-> go

= go
>> pose vishvamitra stand
>> pose vasishtha stand
>> pose dasharatha sit
>> together
>> move rama to 0.6
>> move lakshmana to 0.53
>> wait 0.2
>> face rama left
>> face lakshmana left
>> together
>> pose rama bow
>> pose lakshmana bow
>> wait 0.5
LAKSHMANA: Where my brother goes, I go.
>> pose dasharatha give
DASHARATHA: Go, both of you. Do as he tells you.
>> pose rama stand
>> pose lakshmana stand
>> exit vishvamitra to right in 2.6 nowait
>> wait 0.5
>> exit rama to right in 2.4 nowait
>> wait 0.3
>> exit lakshmana to right in 2.6 nowait
They leave the city on foot, the sage in front, the two princes behind with their bows.
>> wash
-> END
