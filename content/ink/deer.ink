// The Golden Deer — aranya kanda
// Source: Valmiki, Aranya Kanda, sargas 42-44 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene panchavati style=bharni-earth
>> music forest
>> cast rama:exile at 0.34
>> cast sita:exile at 0.24
>> cast lakshmana:exile at 0.46
>> prop hut hut at 0.1 scale=0.8
>> prop deer deer at 0.8 raw=true
A deer is grazing at the edge of the clearing. Its hide is gold and its spots are silver.
>> pose sita point
SITA: Look at it. I have never asked you for anything in the forest. Catch it for me. When we go home it can live in the palace garden.
LAKSHMANA: There is no such deer. This is Maricha. He has killed kings out hunting with this trick.
RAMA: If it is a deer, she will have it. If it is Maricha, he has lived too long. Stay with her. Do not leave her for any reason.
>> battle deer
>> scene deepForest style=bharni-earth
>> music silence
>> cast rama:exile at 0.3
>> cast maricha at 0.7 pose=grieve face=left
Where the deer fell there is a rakshasa, with an arrow in his chest. He draws one breath.
MARICHA: Ha Sita! Ha Lakshmana!
>> shake 3
>> sound fail
It is Rama's voice, exactly. It carries a long way through the trees.
>> pose rama hurt
RAMA: She will hear that.
>> set rama face=-1 pose=stand
>> exit rama to left in 0.8
-> END
