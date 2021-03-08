const fetch = require("node-fetch");
const { v4: uuidv4 } = require('uuid');

module.exports = async function (context, eventGridEvent) {

    //context.log(eventGridEvent);

    //1.Get title and description of the favor post inserted, from eventGridEvent
    const idFavorInserted = eventGridEvent.data.idFavor;
    const titleFavorInserted = eventGridEvent.data.titleFavor;
    const descFavorInserted = eventGridEvent.data.descFavor;
    
    //2. Generate keywords from these two texts
    const { TextAnalyticsClient, AzureKeyCredential } = require("@azure/ai-text-analytics");

    const client = new TextAnalyticsClient("<insert-your-keyword-extractor-endpoint>",
                                           new AzureKeyCredential(""));

    const documents = [titleFavorInserted, descFavorInserted ];

    const results = await client.extractKeyPhrases(documents, "en");

    var favorTitleKeywords = [];
    var favorDescKeywords = [];

    for (const result of results) {
        if (result.error === undefined) {
            if(result.id == 0){
                //Title keywords
                favorTitleKeywords = result.keyPhrases;
            }else{
                //Description keywords
                favorDescKeywords = result.keyPhrases;
            }
        } else {
            console.error("Encountered an error:", result.error);
        }
    }

    var keywordsMerged = favorTitleKeywords.concat(favorDescKeywords);


    //3. Prepare the database update
    var url = '<insert-your-mobileApp-endpoint>/tables/Keywords';
    const headers = {
        'ZUMO-API-VERSION': '2.0.0'
    };

    const getKeywords = () => {
        return fetch(url, {headers})
          .then((response) => response.json())
          .then((json) => {
            return json;
          })
          .catch((error) => {
            console.error(error);
          });
      };
    
    var favors_keywords = [];
    var keywords_toInsert = [];

    var keywords = await getKeywords();

    for(var i=0; i< keywordsMerged.length; i++){
        var found = false;
        for (const keyword of keywords){
            if( keywordsMerged[i] == keyword.name ){
                //Keyoword already present in the table
                found = true;
                //Add the relation favor_keyword
                favors_keywords.push({id: uuidv4(), idFavor: idFavorInserted, idKeyword: keyword.id});
                break;
            }
        }
        if (!found){
            var new_id_keyword = uuidv4();

            //Keyoword not present in the table so add it
            keywords_toInsert.push({id: new_id_keyword,name: keywordsMerged[i]});

            //Add the relation favor_keyword
            favors_keywords.push({id: uuidv4(), idFavor: idFavorInserted, idKeyword: new_id_keyword});
        }


    }

    console.log(keywordsMerged); //New keywords
    console.log(keywords); //Keywords present in the table
    console.log(favors_keywords); //relation favor-keyword
    console.log(keywords_toInsert); //new keywords to insert in the table

    //4. Insert new Keywords in database
    const addKeywords = (k) => {
        return fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'ZUMO-API-VERSION': '2.0.0'
            },
            body: JSON.stringify(k),  
        })
        .then((response) => response.json())
        .then((json) => {
            console.log(json);
            return json;
        })
        .catch((error) => {
            console.error(error);
        });
      };

    for(var i=0; i< keywords_toInsert.length; i++){
        var inserted = await addKeywords(keywords_toInsert[i]);
    }

    //5. Insert relationships FavorPost-Keyword in database
    url = '<insert-your-mobileApp-endpoint>/tables/Favors_Keywords';

    const addFavors_Keywords_relation = (k) => {
        console.log(k);
        return fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'ZUMO-API-VERSION': '2.0.0'
            },
            body: JSON.stringify(k),  
        })
        .then((response) => response.json())
        .then((json) => {
            console.log(json);
            return json;
        })
        .catch((error) => {
            console.error(error);
        });
      };

    for(var i=0; i< favors_keywords.length; i++){
        var inserted = await addFavors_Keywords_relation(favors_keywords[i]);
    }

};
