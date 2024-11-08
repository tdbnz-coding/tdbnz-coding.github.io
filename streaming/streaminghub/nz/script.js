    document.addEventListener("DOMContentLoaded", function() {
    const channels = [
        {
        id: "mjh-discovery-popup1",
        name: "ThreeNow Sport 1",
        logo: "https://cdn.fullscreen.nz/threenow/prod/channels/livestream/1709691768464/20240503T165613_threenow_sport_1_epg_750x500.png",
        stream: "https://i.mjh.nz/.r/discovery-popup1.m3u8",
        epgId: "mjh-discovery-popup1"
    },
    {
        id: "mjh-discovery-hgtv",
        name: "HGTV",
        logo: "https://cdn.fullscreen.nz/threenow/prod/channels/livestream/1710370016016/20240314T115242_hgtvlogo.png",
        stream: "https://i.mjh.nz/.r/discovery-hgtv.m3u8",
        epgId: "mjh-discovery-hgtv"
    },
    {
        id: "mjh-discovery-ptcn",
        name: "CNN Fast",
        logo: "https://cdn.fullscreen.nz/threenow/prod/channels/livestream/1715808491150/20240516T093155_cnnfast_logo_750x500.png",
        stream: "https://i.mjh.nz/.r/discovery-ptcn.m3u8",
        epgId: "mjh-discovery-ptcn"
    },
    {
        id: "mjh-discovery-ptms",
        name: "MovieSphere",
        logo: "https://cdn.fullscreen.nz/threenow/prod/channels/livestream/1711490737342/20240327T110809_moviespherelogo.png",
        stream: "https://i.mjh.nz/.r/discovery-ptms.m3u8",
        epgId: "mjh-discovery-ptms"
    },
    {
        id: "mjh-discovery-ptgn",
        name: "The Graham Norton Show",
        logo: "https://cdn.fullscreen.nz/threenow/prod/channels/livestream/1715808217223/20240516T092707_graham_norton_logo_small_750x500.png",
        stream: "https://i.mjh.nz/.r/discovery-ptgn.m3u8",
        epgId: "mjh-discovery-ptgn"
    },
    {
        id: "mjh-discovery-fast4",
        name: "Warner Bros TV True Crime",
        logo: "https://cdn.fullscreen.nz/threenow/prod/channels/livestream/1700521491288/20231121T121011_truecrimelogo.png",
        stream: "https://i.mjh.nz/.r/discovery-fast4.m3u8",
        epgId: "mjh-discovery-fast4"
    },
    {
        id: "mjh-discovery-fast5",
        name: "Warner Bros TV Paranormal",
        logo: "https://cdn.fullscreen.nz/threenow/prod/channels/livestream/1700521701602/20231121T120842_paranormallogo.png",
        stream: "https://i.mjh.nz/.r/discovery-fast5.m3u8",
        epgId: "mjh-discovery-fast5"
    },
    {
        id: "mjh-discovery-fast1",
        name: "Warner Bros TV Motorheads",
        logo: "https://cdn.fullscreen.nz/threenow/prod/channels/livestream/1701633988394/20231204T090843_motorheadslogo.png",
        stream: "https://i.mjh.nz/.r/discovery-fast1.m3u8",
        epgId: "mjh-discovery-fast1"
    },
    {
        id: "mjh-discovery-fast7",
        name: "West Family Sagas",
        logo: "https://cdn.fullscreen.nz/threenow/prod/channels/livestream/1701634634905/20231204T091943_westfamilylogo.png",
        stream: "https://i.mjh.nz/.r/discovery-fast7.m3u8",
        epgId: "mjh-discovery-fast7"
    },
    {
        id: "mjh-discovery-fast2",
        name: "Warner Bros TV Deadliest Catch",
        logo: "https://cdn.fullscreen.nz/threenow/prod/channels/livestream/1701634318032/20231204T091616_deadliestcatchlogo.png",
        stream: "https://i.mjh.nz/.r/discovery-fast2.m3u8",
        epgId: "mjh-discovery-fast2"
    },
    {
        id: "mjh-discovery-fast6",
        name: "Warner Bros TV House Hunters",
        logo: "https://cdn.fullscreen.nz/threenow/prod/channels/livestream/1700521489922/20231121T120747_househunterslogo.png",
        stream: "https://i.mjh.nz/.r/discovery-fast6.m3u8",
        epgId: "mjh-discovery-fast6"
    },
    {
        id: "mjh-tvnz-1",
        name: "TVNZ 1",
        logo: "https://i.mjh.nz/.images/tvnz-1.png",
        stream: "https://i.mjh.nz/.r/tvnz-1.m3u8",
        epgId: "mjh-tvnz-1"
    },
    {
        id: "mjh-tvnz-2",
        name: "TVNZ 2",
        logo: "https://i.mjh.nz/.images/tvnz-2.png",
        stream: "https://i.mjh.nz/.r/tvnz-2.m3u8",
        epgId: "mjh-tvnz-2"
    },
    {
        id: "mjh-three",
        name: "Three",
        logo: "https://i.mjh.nz/.images/three.png",
        stream: "https://i.mjh.nz/.r/three.m3u8",
        epgId: "mjh-three"
    },
    {
        id: "mjh-bravo",
        name: "Bravo",
        logo: "https://i.mjh.nz/.images/bravo.png",
        stream: "https://i.mjh.nz/.r/bravo.m3u8",
        epgId: "mjh-bravo"
    },
    {
        id: "mjh-maori-tv",
        name: "Whakaata Māori",
        logo: "https://i.mjh.nz/.images/maori-tv.png",
        stream: "https://i.mjh.nz/.r/maori-tv.m3u8",
        epgId: "mjh-maori-tv"
    },
    {
        id: "mjh-tvnz-duke",
        name: "DUKE",
        logo: "https://i.mjh.nz/.images/tvnz-duke.png",
        stream: "https://i.mjh.nz/.r/tvnz-duke.m3u8",
        epgId: "mjh-tvnz-duke"
    },
    {
        id: "mjh-eden",
        name: "eden",
        logo: "https://i.mjh.nz/.images/eden.png",
        stream: "https://i.mjh.nz/.r/eden.m3u8",
        epgId: "mjh-eden"
    },
    {
        id: "mjh-rush-nz",
        name: "RUSH",
        logo: "https://i.mjh.nz/.images/rush-nz.png",
        stream: "https://i.mjh.nz/.r/rush-nz.m3u8",
        epgId: "mjh-rush-nz"
    },
    {
        id: "mjh-te-reo",
        name: "Te Reo",
        logo: "https://i.mjh.nz/.images/te-reo.png",
        stream: "https://i.mjh.nz/.r/te-reo.m3u8",
        epgId: "mjh-te-reo"
    },
    {
        id: "mjh-prime",
        name: "Sky Open",
        logo: "https://i.mjh.nz/.images/sky-open.png",
        stream: "https://i.mjh.nz/.r/prime.m3u8",
        epgId: "mjh-prime"
    },
    {
        id: "mjh-al-jazeera",
        name: "Al Jazeera",
        logo: "https://i.mjh.nz/.images/al-jazeera.png",
        stream: "https://i.mjh.nz/.r/al-jazeera.m3u8",
        epgId: "mjh-al-jazeera"
    },
    {
        id: "mjh-prime-plus1",
        name: "Sky Open+1",
        logo: "https://i.mjh.nz/.images/sky-open.png",
        stream: "https://i.mjh.nz/.r/prime-plus1.m3u8",
        epgId: "mjh-prime-plus1"
    },
    {
        id: "mjh-shine-tv",
        name: "Shine TV",
        logo: "https://i.mjh.nz/.images/shine-tv.png",
        stream: "https://i.mjh.nz/.r/shine-tv.m3u8",
        epgId: "mjh-shine-tv"
    },
    {
        id: "mjh-firstlight",
        name: "Firstlight",
        logo: "https://i.mjh.nz/.images/firstlight.png",
        stream: "https://i.mjh.nz/.r/firstlight.m3u8",
        epgId: "mjh-firstlight"
    },
    {
        id: "mjh-hope-channel",
        name: "Hope Channel",
        logo: "https://i.mjh.nz/.images/hope-channel.png",
        stream: "https://i.mjh.nz/.r/hope-channel.m3u8",
        epgId: "mjh-hope-channel"
    },
    {
        id: "mjh-chinese-tv28",
        name: "Chinese TV28",
        logo: "https://i.mjh.nz/.images/chinese-tv28.png",
        stream: "https://i.mjh.nz/.r/chinese-tv28.m3u8",
        epgId: "mjh-chinese-tv28"
    },
    {
        id: "mjh-chinese-tv29",
        name: "Chinese TV29",
        logo: "https://i.mjh.nz/.images/chinese-tv29.png",
        stream: "https://i.mjh.nz/.r/chinese-tv29.m3u8",
        epgId: "mjh-chinese-tv29"
    },
    {
        id: "mjh-parliament-tv",
        name: "Parliament TV",
        logo: "https://i.mjh.nz/.images/parliament-tv.png",
        stream: "https://i.mjh.nz/.r/parliament-tv.m3u8",
        epgId: "mjh-parliament-tv"
    },
    {
        id: "mjh-apna-television",
        name: "APNA Television",
        logo: "https://i.mjh.nz/.images/apna-television.png",
        stream: "https://i.mjh.nz/.r/apna-television.m3u8",
        epgId: "mjh-apna-television"
    },
    {
        id: "mjh-panda-tv",
        name: "Panda TV",
        logo: "https://i.mjh.nz/.images/panda-tv.png",
        stream: "https://i.mjh.nz/.r/panda-tv.m3u8",
        epgId: "mjh-panda-tv"
    },
    {
        id: "mjh-wairarapa-tv",
        name: "Wairarapa TV",
        logo: "https://i.mjh.nz/.images/wairarapa-tv.png",
        stream: "https://i.mjh.nz/.r/wairarapa-tv.m3u8",
        epgId: "mjh-wairarapa-tv"
    },
    {
        id: "mjh-trackside-1",
        name: "TAB Trackside 1",
        logo: "https://i.mjh.nz/.images/trackside-1.png",
        stream: "https://i.mjh.nz/.r/trackside-1.m3u8",
        epgId: "mjh-trackside-1"
    },
    {
        id: "mjh-trackside-2",
        name: "TAB Trackside 2",
        logo: "https://i.mjh.nz/.images/trackside-2.png",
        stream: "https://i.mjh.nz/.r/trackside-2.m3u8",
        epgId: "mjh-trackside-2"
    },
    {
        id: "mjh-ch200",
        name: "CH200",
        logo: "https://i.mjh.nz/.images/ch200.png",
        stream: "https://i.mjh.nz/.r/ch200.m3u8",
        epgId: "mjh-ch200"
    },
    {
        id: "mjh-juice-tv",
        name: "JuiceTV",
        logo: "https://i.mjh.nz/.images/juice-tv.png",
        stream: "https://i.mjh.nz/.r/juice-tv.m3u8",
        epgId: "mjh-juice-tv"
    },
    {
        id: "mjh-juice-x",
        name: "JuiceX",
        logo: "https://i.mjh.nz/.images/juice-x.png",
        stream: "https://i.mjh.nz/.r/juice-x.m3u8",
        epgId: "mjh-juice-x"
    },
    {
        id: "mjh-tvsn-shopping",
        name: "TVSN Shopping",
        logo: "https://i.mjh.nz/.images/tvsn-shopping.png",
        stream: "https://i.mjh.nz/.r/tvsn-shopping.m3u8",
        epgId: "mjh-tvsn-shopping"
    },
    {
        id: "mjh-redbull-tv",
        name: "Redbull TV",
        logo: "https://i.mjh.nz/.images/redbull-tv.png",
        stream: "https://i.mjh.nz/.r/redbull-tv.m3u8",
        epgId: "mjh-redbull-tv"
    },
    {
        id: "mjh-channel-news-asia",
        name: "Channel News Asia (CNA)",
        logo: "https://i.mjh.nz/.images/channel-news-asia.png",
        stream: "https://i.mjh.nz/.r/channel-news-asia.m3u8",
        epgId: "mjh-channel-news-asia"
    }
];

    const channelList = document.getElementById("channel-list");
    const video = document.getElementById("video");

    // Populate the channel list
    channels.forEach((channel, index) => {
        const listItem = document.createElement("li");
        listItem.classList.add("list-group-item", "d-flex");
        listItem.innerHTML = `<img src="${channel.logo}" alt="${channel.name} logo" class="channel-logo"> ${channel.name}`;
        listItem.addEventListener("click", () => loadChannel(channel, listItem));
        channelList.appendChild(listItem);

        // Load the first channel on page load
        if (index === 0) loadChannel(channel, listItem);
    });

    function loadChannel(channel, listItem) {
        document.querySelectorAll("#channel-list .list-group-item").forEach(item => item.classList.remove("active"));
        listItem.classList.add("active");

        loadStream(channel.stream);
        loadEpgData(channel.epgId);
    }

    function loadStream(streamUrl) {
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = streamUrl;
            video.addEventListener("canplay", () => video.play());
        }
    }

    async function loadEpgData(epgId) {
        const epgUrl = "https://i.mjh.nz/nz/epg.xml";
        try {
            const response = await fetch(epgUrl);
            const epgXml = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(epgXml, "text/xml");

            const programs = Array.from(xmlDoc.getElementsByTagName("programme"));
            const currentProgram = programs.find(program => {
                const channel = program.getAttribute("channel");
                const startTime = program.getAttribute("start");
                const endTime = program.getAttribute("stop");

                const currentDateTime = new Date();
                const programStart = parseEpgTime(startTime);
                const programEnd = parseEpgTime(endTime);

                return channel === epgId && currentDateTime >= programStart && currentDateTime < programEnd;
            });

            const epgContainer = document.getElementById("epg-info");
            epgContainer.innerHTML = currentProgram
                ? `<h5>Now Showing</h5><p>${currentProgram.getElementsByTagName("title")[0].textContent}</p><p>${currentProgram.getElementsByTagName("desc")[0]?.textContent || ""}</p>`
                : `<p>No EPG data available.</p>`;
        } catch (error) {
            console.error("Failed to load EPG data:", error);
        }
    }

    function parseEpgTime(epgTime) {
        const year = epgTime.slice(0, 4);
        const month = epgTime.slice(4, 6);
        const day = epgTime.slice(6, 8);
        const hours = epgTime.slice(8, 10);
        const minutes = epgTime.slice(10, 12);
        return new Date(year, month - 1, day, hours, minutes);
    }
});
