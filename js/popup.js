var currentStatus = new CourseList();
var pageMarker = 0;
var archMarker = 0;

var useCache = true;
var feedCach = {type: "feed", status: "bad", content: null};
var archCach = {type: "arch", status: "bad", content: null};

var feedSortConfig = "ddesc";
var archSortConfig = "ddesc";
var openAllConfig = true;
var alrmVal;
var relDate;


function CourseList() {
    this.courseList = [];
    this.addItem = function(it) {
        for (var i = 0; i < this.courseList.length; ++i) {
            if (this.courseList[i].name === it.parentC) {
                this.courseList[i].addItem(it);
                return;
            }
        }
        var c = new Course();
        c.name = it.parentC;
        c.addItem(it);
        this.courseList.push(c);
    };
    this.getCourseIndex = function(cname) {
        for (var i = 0; i < this.courseList.length; ++i) {
            if (this.courseList[i].name === cname) return i;
        }
    };
    this.nCourse = function() {
        return this.courseList.length;
    };
    this.getCourseByPos = function(i) {
        return this.courseList[i];
    };
    this.getCourseByName = function(name) {
        for (var i = 0; i < this.courseList.length; ++i) {
            if (this.courseList[i].name === name) return this.courseList[i];
        }
        return null;
    };
    this.parseData = function(strData) {
        var courses = strData.split("<course ");
        for (var i = 0; i < courses.length-1; ++i) {
            var c = new Course();
            var name = courses[i+1].substring(0, courses[i+1].indexOf(">"));
            c.name = name;
            var items = courses[i+1].split("<item>");
            for (var j = 0; j < items.length-1; ++j) {
                var itTitle = items[j+1].split("<title>")[1];
                var itLink = items[j+1].split("<link>")[1]; 
                var itDescription = items[j+1].split("<description>")[1];
                var itPubDate = items[j+1].split("<pubDate>")[1];
                var itSeen = (items[j+1].split("<seen>")[1] === "true");
                var itId = items[j+1].split("<id>")[1];

                var it = new FeedItem(name, itTitle, itLink, itDescription, itPubDate, itSeen);
                it.id = itId;
                c.addItem(it);
            }
            this.courseList.push(c);
        }
    };
    this.stringifyData = function() {
        var strData = "<courselist>";
        for (var i = 0; i < this.nCourse(); ++i) {
            var c = this.getCourseByPos(i);
            strData += "<course "+c.name+">";
            for (var j = 0; j < c.nItems(); ++j) {
                var it = c.getItemByPos(j);
                strData += "<item>";
                strData += "<title>"+it.title+"<title>";
                strData += "<link>"+it.link+"<link>";
                strData += "<description>"+it.description+"<description>";
                strData += "<pubDate>"+it.pubDate+"<pubDate>";
                strData += "<seen>"+it.seen+"<seen></item>";
                strData += "<id>"+it.id+"<id></item>";
            }
            strData += "</course>";
        }
        strData += "</courselist>";
        return strData;
    };
    this.hasItem = function(it) {
        for (var i = 0; i < this.courseList.length; ++i) {
            if ((this.courseList[i]).hasItem(it)) return true;
        }
        return false;
    };
    this.hasCourse = function(cname) {
        for (var i = 0; i < this.courseList.length; ++i) {
            if (this.courseList[i].name === cname) return true;
        }
        return false;
    };
}

function Course() {
    this.name = "";
    this.items = [];
    this.addItem = function(i) {
        this.items.push(i);
    };
    this.hasItem = function(it) {
        for (var i = 0; i < this.items.length; ++i) {
            if (equalItems(it, this.items[i])) return true;
        }
        return false;
    };
    this.getItemByPos = function(i) {
        return this.items[i];
    };
    this.nItems = function() {
        return this.items.length;
    };
    this.nUnseenItems = function() {
        var count = 0;
        for (var i = 0; i < this.items.length; ++i) {
            if (!this.items[i].seen) ++count;
        }
        return count;
    };
}

function FeedItem(c, t, l, d, p, s) {
    this.parentC = c;
    this.title = t;
    this.link = l;
    this.description = d;
    this.pubDate = p;
    this.seen = s;
    this.id = 0;
}

function equalItems(it1, it2) {
    var v1 = (it1.parentC === it2.parentC);
    var v2 = (it1.title === it2.title);
    var v3 = (it1.link === it2.link);
    var v4 = (it1.description === it2.description);
    var v5 = (it1.pubDate === it2.pubDate);
    return (v1 && v2 && v3 && v4 && v5);
}

function existsItem(it) {
    for (var i = 0; i < currentStatus.nCourse(); ++i) {
        var c = currentStatus.getCourseByPos(i);
        for (var j = 0; j < c.nItems(); ++j) {
            if (equalItems(c.getItemByPos(j), it)) return true;
        }
    }
    return false;
}

function getItemByIdE(id) {
    for (var i = 0; i < currentStatus.nCourse(); ++i) {
        var c = currentStatus.getCourseByPos(i);
        for (j = 0; j < c.nItems(); ++j) {
            var it = c.getItemByPos(j);
            if (it.id === id) {
                return it;
            }
        }
    }
    return null;
}

function cacheAddItem(it, cache) {
    if (cache.status) {
        var sConfig;
        if (cache.type === "feed") sConfig = feedSortConfig;
        else sConfig = archSortConfig;
        switch(sConfig) {
            case "ddesc":
                for (var i = 0; i < cache.content.length; ++i) {
                    if (moment(it.pubDate).isAfter(cache.content[i].pubDate)) {
                        cache.content.splice(i, 0, it);
                        return;
                    }
                }
                cache.content.push(it);
                return;
            case "dasc":
                for (var i = 0; i < cache.content.length; ++i) {
                    if (moment(it.pubDate).isBefore(cache.content[i].pubDate)) {
                        cache.content.splice(i, 0, it);
                        return;
                    }
                }
                cache.content.push(it);
                return;
            case "tdesc":
                for (var i = 0; i < cache.content.length; ++i) {
                    if (it.title.toUpperCase() > cache.content[i].title.toUpperCase()) {
                        cache.content.splice(i, 0, it);
                        return;
                    }
                }
                cache.content.push(it);
                return;
            case "tasc":
                for (var i = 0; i < cache.content.length; ++i) {
                    if (it.title.toUpperCase() < cache.content[i].title.toUpperCase()) {
                        cache.content.splice(i, 0, it);
                        return;
                    }
                }
                cache.content.push(it);
                return;
            case "cour":
                for (var i = 0; i < cache.content.length; ++i) {
                    if (it.parentC.toUpperCase() < cache.content[i].parentC.toUpperCase()) {
                        cache.content.splice(i, 0, it);
                        return;
                    }
                }
                cache.content.push(it);
                return;
        }
    }
}

function cacheRemoveItem(it, cache) {
    if (cache.status) {
        for (var i = 0; i < cache.content.length; ++i) {
            if (equalItems(cache.content[i], it)) {
                cache.content.splice(i, 1);
                return;
            }
        }
    }
}

function cacheValidate(cont, cache) {
    cache.status = "ok";
    cache.content = cont;
}

function cacheInvalidate(cache) {
    cache.status = "bad";
    cache.content = null;
}

function refreshBadge(n) {
    if (n === 0) chrome.browserAction.setBadgeText({text: ""});
    else chrome.browserAction.setBadgeText({text: n.toString()});
}

function getLastId() {
    var li;
    if (localStorage.getItem('lastIdentifier')) {
        li = parseInt(localStorage.getItem('lastIdentifier'));
    } else li = 1;
    var nli = li+1;
    localStorage.setItem('lastIdentifier', nli);
    return li;
}

function clearContainer(cont) {
    var doc = document.getElementById(cont+"container");
    doc.innerHTML = "";
}

function labelColorPicker(cname) {
    var index = (currentStatus.getCourseIndex(cname))%6;
    switch (index) {
        case 0:
            return "primary";
        case 1:
            return "success";
        case 2:
            return "info";
        case 3:
            return "warning";
        case 4:
            return "danger";
        case 5:
            return "default";
    }
}

function minTitle(title) {
    var sTitle = title.substring(0, 47);
    return sTitle.concat("...");
}

function removeItems(read) {
    if (read) $("#archcontainer").empty();
    else $("#feedcontainer").empty();
}

function showItem(item, end, still, read) {
    var cont;
    if (read) cont = "archcontainer";
    else cont = "feedcontainer";
    var doc = document.getElementById(cont);
    var plainCode = "<div class=\"list-group-item\" id=\""+item.id+"\"><span class=\"label label-"+labelColorPicker(item.parentC)+"\">";
    plainCode += item.parentC+"</span><span><h4 class=\"list-group-item-heading\"> ";
    if (item.title.length > 47) plainCode += minTitle(item.title)+"</h4></span>";
    else plainCode += item.title+"</h4></span>";
    plainCode += "<p class=\"list-group-item-text\"><a class=\"commonlink\" href=\"";
    if (!read) plainCode += item.link+"\" target=\"_blank\">abrir aviso</a> | <a href=\"#markread\">marcar como leído</a></p><p class=\"list-group-item-text\">";
    else plainCode += item.link+"\" target=\"_blank\">abrir aviso</a> | <a href=\"#unmarkread\">marcar como no leído</a></p><p class=\"list-group-item-text\">";
    if (relDate) plainCode += moment(item.pubDate).fromNow()+"</p></div>";
    else plainCode += moment(item.pubDate).format("dddd, D [de] MMMM [de] YYYY, HH:mm:ss")+"</p></div>";
    doc.innerHTML += plainCode;
    if (end) {
        plainCode = "<ul class=\"pager\">";
        plainCode += "<li class=\"previous";
        if ((pageMarker === 0 && !read) || (archMarker === 0) && read) plainCode += " disabled";
        if (read) plainCode += "\"><a class=\"prevarch\" href=\"#prev\">&larr; anterior</a></li>";
        else plainCode += "\"><a class=\"prevfeed\" href=\"#prevfeed\">&larr; anterior</a></li>";
        plainCode += "<li class=\"next";
        if (still) plainCode += " disabled";
        if (read) plainCode += "\"><a class=\"nextarch\" href=\"#next\">siguiente &rarr;</a></li>";
        else plainCode += "\"><a class=\"nextfeed\" href=\"#nextfeed\">siguiente &rarr;</a></li>";
        doc.innerHTML += plainCode;
        attachNavLinks(still, read);
    }
}

function attachLinks(s) {
    if (!s) {
        $('a[href="#markread"]').click(function() {
            var cuteId = $( this ).parent().parent().attr( "id" );
            var itn = getItemByIdE(cuteId);
            console.log("\""+itn.title+"\" marked as seen");
            itn.seen = true;
            requestSave();
            $( this ).parent().parent().fadeOut( "slow", function() {
                $( this ).remove();
                if (useCache) cacheRemoveItem(itn, feedCach);
                showPage(feedCach.content, pageMarker, false);
                if (archCach.status === "ok") {
                    cacheAddItem(itn, archCach);
                    showPage(archCach.content, archMarker, true);
                }
                var n = $("#tab1").children().html();
                n = parseInt(n) - 1;
                updateBadges(n);
                $("#tab1").children().html(n);
                $("#emptycontent2").attr('style', "display: none;");
                if (n === 0) {
                    $("#emptycontent").removeAttr('style');
                    $('a[href="#next"]').remove();
                    $('a[href="#prev"]').remove();
                }
            });   
        });
    } else {
        $('a[href="#unmarkread"]').click(function() {
            var cuteId = $( this ).parent().parent().attr( "id" );
            var itn = getItemByIdE(cuteId);
            console.log("\""+itn.title+"\" marked as unseen");
            itn.seen = false;
            requestSave();
            $( this ).parent().parent().fadeOut( "slow", function() {
                $( this ).remove();
                if (useCache) cacheAddItem(itn, feedCach);
                showPage(feedCach.content, pageMarker, false);
                if (archCach.status === "ok") {
                    cacheRemoveItem(itn, archCach);
                    showPage(archCach.content, archMarker, true);
                }
                var n = $("#tab1").children().html();
                n = parseInt(n) + 1;
                updateBadges(n);
                $("#tab1").children().html(n);
                if (archCach.status === "ok" && archCach.content.length === 0) {
                    $("#emptycontent2").removeAttr('style');
                    $( "#toolbtns" ).attr('style', "display: none;");
                }  
            });
        });
    }  
}

function attachNavLinks(still, read) {
    if (read) {
        $('.nextarch').click(function(event) {
            event.stopImmediatePropagation();
            if (!still) {
                removeItems(true);
                archMarker += 5;
                showReadItems();
            }
        });
        $('.prevarch').click(function(event) {
            event.stopImmediatePropagation();
            if (archMarker > 4) {
                removeItems(true);
                archMarker -= 5;
                showReadItems();
            }
        });
    } else {
        $('.nextfeed').click(function(event) {
            event.stopImmediatePropagation();
            if (!still) {
                removeItems(false);
                pageMarker += 5;
                showLatestItems();
            }
        });
        $('.prevfeed').click(function(event) {
            event.stopImmediatePropagation();
            if (pageMarker > 4) {
                removeItems(false);
                pageMarker -= 5;
                showLatestItems();
            }
        });
    }  
}

function updateBadges(n) {
    refreshBadge(n);
    $("#tab1").html("Últimos avisos <span class=\"badge\">"+n+"</span>");
    if (n > 0) {
        $("#emptycontent").attr('style', "display: none;");
        $( "#toolbtns" ).removeAttr('style');
        $( "#goraco" ).removeAttr('style');
        $( "#openlinks" ).removeAttr('style');
        $( "#sorter" ).removeAttr('style');
    } else {
        $("#emptycontent").removeAttr('style');
        $( "#goraco" ).attr('style', "display: none;");
        $( "#openlinks" ).attr('style', "display: none;");
        $( "#sorter" ).attr('style', "display: none;");
    }
}

chrome.runtime.onConnect.addListener(function(port) {
    console.assert(port.name === "control");
    port.onMessage.addListener(function(msg) {
        if (msg.code === "loadedstatus") {
            currentStatus = new CourseList();
            currentStatus.parseData(msg.content);
            console.log("Status restored");
            var items = getUnreadItems();
            updateBadges(items.length);
            sortItemsByDate(items, "d");
            cacheValidate(items, feedCach);
            document.dispatchEvent(loadedContentEvent);
        } else if (msg.code === "emptystatus") {
            console.log("Couldn't restore status");
        } else if (msg.code === "livenewsfeed") {
            currentStatus = new CourseList();
            if (useCache) cacheInvalidate(feedCach);
            requestLoad();
        }
    });
});

function requestSave() {
    console.log("Requesting save operation...");
    chrome.extension.getBackgroundPage().saveSlot = currentStatus.stringifyData();
    chrome.extension.getBackgroundPage().saveStatus();
}

function requestLoad() {
    console.log("Requesting saved data...");
    chrome.extension.getBackgroundPage().loadStatus();
}

function requestNewItems() {
    console.log("Requesting latest received items...");
    chrome.extension.getBackgroundPage().sendNewItems();
}

function showPage(items, marker, amode) {
    if (amode) {
        if (archMarker >= archCach.content.length) {
            archMarker -= 5; marker -= 5;
            if (archMarker < 0) {
                archMarker = 0; marker = 0;
            }
        }
        clearContainer("arch");
    } else {
        if (pageMarker >= feedCach.content.length) {
            pageMarker -= 5; marker -= 5;
            if (pageMarker < 0) {
                pageMarker = 0; marker = 0;
            }
        }
        clearContainer("feed");
    }
    for (var i = marker; i < items.length && i < marker+5; ++i) {
        showItem(items[i], (items.length-1 === i || i === marker+4), (items.length-marker < 6), amode);
    }
    if (amode) attachLinks(true);
    else attachLinks(false);
}

function getUnreadItems() {
    var items = [];
    for (var i = 0; i < currentStatus.nCourse(); ++i) {
        var cIts = getUnreadItemsFromCourse((currentStatus.getCourseByPos(i)).name);
        for (var j = 0; j < cIts.length; ++j) items.push(cIts[j]);
    }
    return items;
}

function showLatestItems() {
    if (useCache && feedCach.status === "ok") {
        console.log("Reading from cached content (feed)");
        showPage(feedCach.content, pageMarker, false);
        return;
    }
}

function getReadItems() {
    var items = [];
    for (var i = 0; i < currentStatus.nCourse(); ++i) {
        var cIts = getReadItemsFromCourse((currentStatus.getCourseByPos(i)).name);
        for (var j = 0; j < cIts.length; ++j) items.push(cIts[j]);
    }
    return items;
}

function showReadItems() {
    if (useCache && archCach.status === "ok") {
        console.log("Reading from cached content (archive)");
        showPage(archCach.content, archMarker, true);
        return;
    }
}

var loadedContentEvent = new Event('loadedContent');
document.addEventListener('loadedContent', function() {
    if (pageMarker === 0) {
        showLatestItems();
    }
});

function requestRefreshAndLoad() {
    console.log("Requesting refresh and load");
    chrome.extension.getBackgroundPage().refreshAndLoad();
}

function openCurrentPageLinks(mode) {
    var cacheContent, marker;
    if (mode === "feed") {
        cacheContent = feedCach.content;
        marker = pageMarker;
    } else if (mode === "arch") {
        cacheContent = archCach.content;
        marker = archMarker;
    }
    var last;
    for (var i = marker; (i < cacheContent.length && i < marker+5) || (i < cacheContent.length && openAllConfig); ++i) {
        var it = getItemByIdE(cacheContent[i].id);
        chrome.tabs.create({ url: it.link });
        if (mode === "feed") it.seen = true;
        last = i;
    }
    if (mode === "feed") {
        cacheContent.splice(marker, last-marker+1);
        requestSave();
        updateBadges(cacheContent.length);
    }
}

function changeAlarmPeriod() {
    chrome.extension.getBackgroundPage().alarmPeriod = alrmVal;
    chrome.extension.getBackgroundPage().updateAlarmPeriod();
    localStorage.setItem('alarmPeriod', alrmVal);
}

document.addEventListener('DOMContentLoaded', function() {
    moment.lang('es');
    if (useCache) cacheInvalidate(feedCach);
    requestRefreshAndLoad();
    
    //Alarm period config
    if (localStorage.getItem('alarmPeriod')) {
        alrmVal = parseInt(localStorage.getItem('alarmPeriod'));
    } else {
        localStorage.setItem('alarmPeriod', 1);
        alrmVal = 1;
    }
    
    //Date format config
    if (localStorage.getItem('dateFormat')) {
        if (localStorage.getItem('dateFormat') === "rel") {
            relDate = true;
            $("#reldate").attr("checked", "checked");
        }
        else {
            relDate = false;
            $("#absdate").attr("checked", "checked");
        }
    } else {
        localStorage.setItem('dateFormat', "rel");
        relDate = true;
        $("#reldate").attr("checked", "checked");
    }
    
    //Desktop notifications config
    if (localStorage.getItem('desktopNotf')) {
        if (localStorage.getItem('desktopNotf') === "en") {
            chrome.extension.getBackgroundPage().showNotificationsConfig = true;
            $("#enablednotfs").attr("checked", "checked");
        } else {
            chrome.extension.getBackgroundPage().showNotificationsConfig = false;
            $("#disablednotfs").attr("checked", "checked");
        }
    } else {
        localStorage.setItem('desktopNotf', "en");
        chrome.extension.getBackgroundPage().showNotificationsConfig = true;
        $("#enablednotfs").attr("checked", "checked");
    }
    
    ///////////////
    ///////////////
    $(document).ready(function() {
        //Item links
        $('.commonlink').click(function() {
            chrome.tabs.create({url: $(this).attr('href')});
        });
        
        //First tab
        $('a[href = "#panel-670599"]').click(function() {
            pageMarker = 0;
            showLatestItems();
        });
        
        //Second tab
        $('a[href = "#panel-481044"]').click(function() {
            archMarker = 0;
            if (archCach.status === "bad") {
                var items = getReadItems();
                if (items.length > 0) {
                    $("#emptycontent2").attr('style', "display: none;");
                } else {
                    $("#emptycontent2").removeAttr('style');
                    $( "#toolbtns" ).attr('style', "display: none;");
                }
                sortItemsByDate(items, "d");
                cacheValidate(items, archCach);
            }
            showReadItems();
        });
        
        //Toolbar for first tab
        $('a[href = "#panel-670599"]').on('shown.bs.tab', function (e) {
            if (feedCach.status === "ok" && feedCach.content.length > 0) {
                $( "#goraco" ).removeAttr('style');
                $( "#openlinks" ).removeAttr('style');
                $( "#sorter" ).removeAttr('style');
            } else {
                $( "#goraco" ).attr('style', "display: none;");
                $( "#openlinks" ).attr('style', "display: none;");
                $( "#sorter" ).attr('style', "display: none;");
            }
            $( "#toolbtns" ).removeAttr('style');
            $('#refreshbtn').removeAttr('style');
        });
        
        //Toolbar for second tab
        $('a[href = "#panel-481044"]').on('shown.bs.tab', function (e) {
            if (archCach.status === "ok" && archCach.content.length > 0) {
                $( "#goraco" ).removeAttr('style');
                $( "#openlinks" ).removeAttr('style');
                $( "#sorter" ).removeAttr('style');
            }
            else {
                $( "#goraco" ).attr('style', "display: none;");
                $( "#openlinks" ).attr('style', "display: none;");
                $( "#sorter" ).attr('style', "display: none;");
            }
            $( "#toolbtns" ).removeAttr('style');
            $('#refreshbtn').attr('style', "display: none;");
        });
        
        //Toolbar? for third tab
        $('a[href = "#panel-536660"]').on('shown.bs.tab', function (e) {
            $( "#toolbtns" ).attr('style', "display: none;");
        });
        
        //Sorting button options
        $('#sorttasc').click(function() {
            if ($( "#panel-670599" ).hasClass( "active" )) {
                sortItemsByTitle(feedCach.content, "a");
                pageMarker = 0;
                feedSortConfig = "tasc";
                showLatestItems();
            } else if ($( "#panel-481044" ).hasClass( "active" )) {
                sortItemsByTitle(archCach.content, "a");
                archMarker = 0;
                archSortConfig = "tasc";
                showReadItems();
            }
        });
        $('#sorttdesc').click(function() {
            if ($( "#panel-670599" ).hasClass( "active" )) {
                sortItemsByTitle(feedCach.content, "d");
                pageMarker = 0;
                feedSortConfig = "tdesc";
                showLatestItems();
            } else if ($( "#panel-481044" ).hasClass( "active" )) {
                sortItemsByTitle(archCach.content, "d");
                archMarker = 0;
                archSortConfig = "tdesc";
                showReadItems();
            }
        });
        $('#sortdasc').click(function() {
            if ($( "#panel-670599" ).hasClass( "active" )) {
                sortItemsByDate(feedCach.content, "a");
                pageMarker = 0;
                feedSortConfig = "dasc";
                showLatestItems();
            } else if ($( "#panel-481044" ).hasClass( "active" )) {
                sortItemsByDate(archCach.content, "a");
                archMarker = 0;
                archSortConfig = "dasc";
                showReadItems();
            }
        });
        $('#sortddesc').click(function() {
            if ($( "#panel-670599" ).hasClass( "active" )) {
                sortItemsByDate(feedCach.content, "d");
                pageMarker = 0;
                feedSortConfig = "ddesc";
                showLatestItems();
            } else if ($( "#panel-481044" ).hasClass( "active" )) {
                sortItemsByDate(archCach.content, "d");
                archMarker = 0;
                archSortConfig = "ddesc";
                showReadItems();
            }
        });
        $('#sortcour').click(function() {
            if ($( "#panel-670599" ).hasClass( "active" )) {
                sortItemsByCourse(feedCach.content);
                pageMarker = 0;
                feedSortConfig = "cour";
                showLatestItems();
            } else if ($( "#panel-481044" ).hasClass( "active" )) {
                sortItemsByCourse(archCach.content);
                archMarker = 0;
                archSortConfig = "cour";
                showReadItems();
            }
        });

        //Open Raco button
        $('#goraco').click(function() {
            chrome.tabs.create({ url: "https://raco.fib.upc.edu/home/portada" });
        });
        
        //Open all items button
        $('#openlinks').click(function() {
            if ($( "#panel-670599" ).hasClass( "active" )) {
                openCurrentPageLinks("feed");
            } else if ($( "#panel-481044" ).hasClass( "active" )) {
                openCurrentPageLinks("arch");
            }
        });
        
        //Refresh content button
        $('#refreshbtn').click(function() {
            var btn = $(this);
            btn.button('loading');
            requestRefreshAndLoad();
            setTimeout(function() {
                btn.button('reset');
            }, 4000);
        });
        
        ///////////////
        /// Config tab
        ///////////////
        
        //Clear local storage button
        $('#clearstorage').click(function() {
            var btn = $(this);
            chrome.extension.getBackgroundPage().clearStorageData();
            btn.button('loading');
        });
        
        //Alarm value slider
        $(function() {
            $("#slider").slider({
                value: alrmVal,
                min: 1,
                max: 60,
                step: 1,
                slide: function(event, ui) {
                    $("#amount").val(ui.value+" min");
                    alrmVal = ui.value;
                    changeAlarmPeriod();
                }
            });
            $("#amount").val($("#slider").slider("value")+" min");
        });
        
        //Date format radio buttons
        $('input[name="dateformat"]').on('change', function() {
            if ($(this).val() === 'rel') {
                localStorage.setItem('dateFormat', "rel");
                relDate = true;
            } else {
                localStorage.setItem('dateFormat', "abs");
                relDate = false;
            }
        });
        
        //Desktop notifications radio buttons
        $('input[name="desktopnotfs"]').on('change', function() {
            if ($(this).val() === 'dnotfs') {
                localStorage.setItem('desktopNotf', "en");
                chrome.extension.getBackgroundPage().showNotificationsConfig = true;
            } else {
                localStorage.setItem('desktopNotf', "dis");
                relDate = false;chrome.extension.getBackgroundPage().showNotificationsConfig = false;
            }
        });
        
        //Tooltips
        $('#clearstorage').tooltip();
        $('#helpnotfs').tooltip();
        $('#helpdate').tooltip();
        
    });
});
    
/////////////
////////////
///////////
//////////
/////////
////////
///////
    
function getUnreadItemsFromCourse(cname) {
    var unreadItems = [];
    var c = currentStatus.getCourseByName(cname);
    for (var i = 0; i < c.nItems(); ++i) {
        if (!c.getItemByPos(i).seen) unreadItems.push(c.getItemByPos(i));
    }
    return unreadItems;
}

function getReadItemsFromCourse(cname) {
    var readItems = [];
    var c = currentStatus.getCourseByName(cname);
    for (var i = 0; i < c.nItems(); ++i) {
        if (c.getItemByPos(i).seen) readItems.push(c.getItemByPos(i));
    }
    return readItems;
}

function sortByDescDate(item1, item2) {
    if (moment(item1.pubDate).isAfter(item2.pubDate)) return -1;
    if (moment(item1.pubDate).isBefore(item2.pubDate)) return 1;
    return 0;
}

function sortByAscDate(item1, item2) {
    if (moment(item1.pubDate).isAfter(item2.pubDate)) return 1;
    if (moment(item1.pubDate).isBefore(item2.pubDate)) return -1;
    return 0;
}

function sortItemsByDate(list, mode) {
    if (mode === "d") {
        list.sort(sortByDescDate);
    } else if (mode === "a") {
        list.sort(sortByAscDate);
    }
    return list;
}

function sortByDescTitle(item1, item2) {
    if (item1.title.toUpperCase() > item2.title.toUpperCase()) return -1;
    if (item1.title.toUpperCase() < item2.title.toUpperCase()) return 1;
    return 0;
}

function sortByAscTitle(item1, item2) {
    if (item1.title.toUpperCase() > item2.title.toUpperCase()) return 1;
    if (item1.title.toUpperCase() < item2.title.toUpperCase()) return -1;
    return 0;
}

function sortByCourseName(item1, item2) {
    if (item1.parentC.toUpperCase() > item2.parentC.toUpperCase()) return 1;
    if (item1.parentC.toUpperCase() < item2.parentC.toUpperCase()) return -1;
    return sortByDescDate(item1, item2);
}

function sortItemsByTitle(list, mode) {
    if (mode === "d") {
        list.sort(sortByDescTitle);
    } else if (mode === "a") {
        list.sort(sortByAscTitle);
    }
    return list;
}

function sortItemsByCourse(list) {
    list.sort(sortByCourseName);
}