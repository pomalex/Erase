

const clearInterval = 30 // Every 30 seconds by default

const LOG = console.log

const badDomains = [

	"facebook.com",
	"twitter.com",
	"instagram.com",
	"messenger.com",
	"pinterest.com",
	
	// Any other domains can be added to this list (don't forget to separate them by commas)
];



// Entry point (extension starts):
// We're making first History check on startup and then do the same every intervalInSeconds seconds (30 by default)

(function scheduleAutoClearing (intervalInSeconds) {

	clearNewHistory (() => { // We're clearing the History and then setting the timer to do it again after intervalInSeconds

		setTimeout (scheduleAutoClearing, intervalInSeconds * 1000, intervalInSeconds)
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

			if (!result.lastCheck) { // If extension was launched first time
				
				removeBrowsingHistory (0) // Removes all browsing hitory at once

				LOG ("Removed all browsing history")
			}
    	})
    })
}






// We track changes in History and retrive url user has just visited. Then we check this url -- whether its domain contains one of
// prohibited domains from our list. If so -- we instantly delete this url from user's History (and clean Browsing History at the same time --
// cutting off very last entry in browsing history, which corresponds to one of bad urls)

chrome.history.onVisited.addListener((historyItem) => {

	const url = historyItem.url

	const timeStamp = Date.now() - 250

	LOG ("onVisited: ", url)

	if (url) {

		for (let i = 0; i < badDomains.length; i++) {

			const domain = badDomains[i]

			if (isDomainContainsStr (url, domain)) {
				deleteUrl (url)
				removeBrowsingHistory (timeStamp)
				break
			}
		}
	}

})


function removeBrowsingHistory (fromTimeMs) {
	
	return new Promise ((resolve, reject) => {

    	chrome.browsingData.remove({ since: fromTimeMs }, { history: true }, resolve)
    })
}



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

					const promise = deleteUrl(url)
					promises.push(promise)

					break
				}
		
			}
		}

		return Promise.all(promises).then((results)=>{})
		
	})
}



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



// Function retrieces all History (by default) -- it's possible to specify time range, if some params passed

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


