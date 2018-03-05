
/*

For this job, you will create a Chrome Extension that always removes certain sites from autocomplete.
The problem: When people type "F" into Chrome, it will autocomplete "Facebook.com" and this will draw people
back into Facebook to waste time.

The solution: This browser plugin will ensure that Facebook, and a few other sites, will never autocomplete.
It will save people time and prevent them from being sucked back into distracting sites.
Spec: Design a plugin that ensures that the following URL's never autocomplete in Chrome:


The working title of the program is "Erase." You will deliver code, instructions to build the plugin,
and a packaged extension that can be tested in Chrome

TODO:

-щас такая проблнма -- вызов history.search не возвращает всю инфу нужную
-попробовать цеплять хттп и хттпс
-потыркаться ещё всяко, поиграть с параметрами
-поискать ответы на стековерфлоу

ПОЧЕМУ-ТО НЕ ВЫДАЁТ УРЛЫ, СОДЕРЖАЩИЕ ПРЯМО ССЫЛКИ С УКАЗАННЫМ КЕЙВОРДОМ

-разобраться с проблемой зависания и устранить
-создать публичный репо на гитхабе

-


Если я вбиваю один адрес, а браузер редиректит, то в Хистори попадает адрес редиректа
а первоначальный нет, но он зато всплывает как подсказка в адресной строке -- как удалить????

ПОПРОБОВАТЬ СПЕРВА ОЧИСТИТЬ БРАУЗЕРНУЮ ДАТУ ЦЕЛИКОМ, А ПОТОМ ПОЛЬЗОВАТЬСЯ РАСШИРЕНИЕМ

Поискать как получать список подсказок ещё -- мб это поможет

-если тереть браузерную дату, то можно брать промежутками -- чтобы оставался материал для тестирования
-чем вообще отличается стирание истории через хистори апи от стирания её же через браузердату?


Две стратегии:

-убираем всю историю за раз и потом устраняем любые новые попадания
-убираем 


TODO:

-попробовать удалять куки (СПЕРВА РАЗОБРАТЬСЯ КАК ОНИ УДАЮЛЯЮТСЯ!! СМ. Рашсирение)
-попробовать удалять браузерхистори (Изучить как работает)
-????
-поискать расширение
-погуглить, узнать -- мб вся суть в том, что хром синхронизирует историю и всё остальное с гугл-аккаунтом

https://bugs.chromium.org/p/chromium/issues/detail?id=395955

*/

const clearInterval = 30 // Every 30 seconds by default

const LOG = console.log

const badDomains = [

	// "facebook.com",
	// "twitter.com",
	// "instagram.com",
	// "messenger.com",
	// "pinterest.com",
	"vk.com"

];

chrome.storage.local.remove("lastCheck");


// Entry point (extension starts):
// We're making first History check on startup and then do the same every intervalInSeconds seconds (30 by default)

(function scheduleAutoClearing (intervalInSeconds) {

	clearNewHistory (() => { // We're clearing the History and then setting the timer to do it again after intervalInSeconds

		//setTimeout (scheduleAutoClearing, intervalInSeconds * 1000, intervalInSeconds)
	})
	
})(clearInterval)



// Gets lastCheck time from local storage -- to understand from what time we should clear the history for our badDomains
// Then it does the work (clears new entries in History) and then saves time of last check 

function clearNewHistory (callback) {

	chrome.storage.local.get("lastCheck", (result) => {

		// If there's a first launch of extension and lastCheck was not saved before -- it will appears as "undefined" and 
		// clearHistory() will default it to 0 ms -- "epoch time", so history will be checked from very first entry

    	clearHistory (badDomains, result.lastCheck).then(() => {

    		chrome.storage.local.set({ lastCheck: Date.now() - 3000 }, callback) // Set lastCheck time to current time minus 3 seconds -- a little gap
			// to avoid the situation when user visits some site and it gets into History just before we've saved lastCheck
    	})
    })
}






// We track changes in History and retrive url user has just visited. Then we check this url -- whether its domain contain one of
// prohibited domains from our list. If so -- we instantly delete this url from user's History

chrome.history.onVisited.addListener((historyItem) => {

	const url = historyItem.url

	const timeStamp = Date.now() - 250

	LOG ("onVisited: ", url)

	if (url) {

		for (let i = 0; i < badDomains.length; i++) {

			const domain = badDomains[i]

			if (isDomainContainsStr (url, domain)) {
				deleteUrl (url)
				chrome.browsingData.remove({ since: timeStamp }, { history: true }, () => {

				})
				break
			}
		}
	}

})



// window.removeCookiesAndHistory = function (domain) {

// 	chrome.history.search({ text: '', startTime: 0, maxResults: 10000000}, (historyItems) => {

// 	    for (let i in historyItems) {

// 	    	let url = historyItems[i].url
// 	    	if (url && isDomainContainsStr(url, domain)) {
// 	    		chrome.history.deleteUrl ({ url: url }, ((url) => {
	    			
// 	    			return () => {
// 	    				console.log ("DELETE FROM HISTORY: %s", url)
// 	    			}

// 	    		})(url))
// 	    	}
// 	    }

// 	    chrome.cookies.getAll({ domain: domain }, (cookies) => {

// 			console.log ("COOKIES: ", cookies)

// 			for (let i in cookies) {

// 				const cookie = cookies[i]

// 				console.log ("%s) ", i, cookie)

// 				if (("." + domain).indexOf(cookie.domain) >= 0) {
// 			  		url = "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain + cookie.path
// 			  		chrome.cookies.remove({"url": url, "name": cookie.name}, ((url, name) => {

// 			  			return () => {
// 			  				console.log ("DELETE COOKIE: %s FOR URL: %s", name, url)
// 			  			}

// 			  		})(url, cookie.name))
// 				}
// 			}
// 		})
// 	})
// }


// Clears the history for all given domains

function clearHistory (domains, timeFrom, timeTo) {

	return getHistoryUrls (timeFrom, timeTo).then(({ urls }) => {

		const promises = []

		for (let j = 0; j < urls.length; j++) {

			const url = urls[j]

			for (let i = 0; i < domains.length; i++) {

				// Check if domain we pass here (e.g. "twitter.com") is a part of real domain in a url:
				// Example 1: https://twitter.com/somePath - right match
				// Example 2: https://somesite.com/somePath?param=twitter.com - wrong match

				if (isDomainContainsStr (url, domains[i])) {

					LOG ("URL TO DELETION: ", url)

					// const promise = deleteUrl(url)
					// promises.push(promise)

					chrome.history.deleteUrl({ url: url }, ((url) => {

						return () => {
							LOG ("DELETED: %s", url, arguments)
						}
						
					})(url)) // Deletes url from user's History

					break
				}
		
			}
		}

		// return Promise.all(promises).then((results)=>{
		// 	LOG ("PROMISE ALL RESULTS: ", results)
		// })
		
	})

}

// function clearHistory (domains, timeFrom, timeTo) {

// 	const promises = []

// 	for (let i = 0; i < domains.length; i++) {

// 		getHistoryUrls (domains[i], timeFrom, timeTo).then(({ urls, searchStr }) => {

// 			for (let j = 0; j < urls.length; j++) {

// 				const url = urls[j]

// 				if (isDomainContainsStr (url, searchStr)) {

// 					// Check if domain we pass here (e.g. "twitter.com") is a part of real domain in a url:
// 					// Example 1: https://twitter.com/somePath - right match
// 					// Example 2: https://somesite.com/somePath?param=twitter.com - wrong match

// 					const promise = deleteUrl(url)
// 					promises.push(promise)
// 				}
// 			}
			
// 		})
// 	}

// 	return Promise.all(promises).then((results)=>{})
// }



// Deletes given URL from user's History

function deleteUrl (url) {

	return new Promise ((resolve, reject) => {

    	chrome.history.deleteUrl({ url: url }, () => {

    		LOG ("DELETED: %s", url, arguments)
    		resolve()

    	}) // Deletes url from user's History
    })
}


// Checks -- whether url's domain part contains given string or not

function isDomainContainsStr (url, str) {

	let split = url.split("/")
	if (split.length > 2 && split[2].indexOf(str) >= 0) {
		return true
	}
	return false
}



// Function does history search by given string and also allows to specify time range 
// if time range is not specified, it defaults timeFrom to 0 ("epoch time"), and timeTo -- to current time

// function getHistoryUrls (searchStr, timeFrom, timeTo) {

// 	if (!timeFrom) {
// 		timeFrom = 0
// 	}

// 	if (!timeTo) {
// 		timeTo = Date.now()
// 	}

//     return new Promise ((resolve, reject) => {

//     	const params = {
//     		text: searchStr,
//     		startTime: timeFrom,
//     		endTime: timeTo,
//     		maxResults: 1000000000
//     	}

//         chrome.history.search(params, (historyItems) => {

//         	const urls = []

// 		    for (let i = 0; i < historyItems.length; i++) {

// 		    	let url = historyItems[i].url
// 		    	if (url) {
// 		    		urls.push(url)
// 		    	}
// 		    }

//     		resolve({ searchStr: searchStr, urls: urls })
// 		})
//     })
// }


function getHistoryUrls (timeFrom, timeTo) {

	if (!timeFrom) {
		timeFrom = 0
	}

	if (!timeTo) {
		timeTo = Date.now()
	}

    return new Promise ((resolve, reject) => {

    	const params = {
    		text: "",
    		startTime: timeFrom,
    		endTime: timeTo,
    		maxResults: 1000000000
    	}

        chrome.history.search(params, (historyItems) => {

        	const urls = []

		    for (let i = 0; i < historyItems.length; i++) {

		    	let url = historyItems[i].url
		    	if (url) {
		    		urls.push(url)
		    	}
		    }

    		resolve({ urls: urls })
		})
    })
}