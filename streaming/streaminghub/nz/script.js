$(document).ready(function() {
  const epgUrl = 'https://i.mjh.nz/nz/epg.xml';

  // Load channels from channels.json
  $.getJSON('channels.json', function(channels) {
    channels.forEach(channel => {
      $('#channel-list').append(`
        <a href="#" class="list-group-item list-group-item-action" data-id="${channel.id}">
          <img src="${channel.logo}" alt="${channel.name}" class="img-fluid mr-2" style="width: 30px;">
          ${channel.name}
        </a>
      `);
    });

    // Default to first channel
    if (channels.length > 0) {
      playChannel(channels[0].url);
      loadEPG(channels[0].epgId);
      $(`#channel-list .list-group-item:first`).addClass('active');
    }

    // Handle channel selection
    $('#channel-list').on('click', '.list-group-item', function(e) {
      e.preventDefault();
      const channelId = $(this).data('id');
      const channel = channels.find(c => c.id === channelId);
      if (channel) {
        playChannel(channel.url);
        loadEPG(channel.epgId);
        $('#channel-list .list-group-item').removeClass('active');
        $(this).addClass('active');
      }
    });
  });

  // Function to play selected channel
  function playChannel(url) {
    const video = document.getElementById('video');
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function() {
        video.play();
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', function() {
        video.play();
      });
    }
  }

  // Load EPG data for selected channel
  function loadEPG(epgId) {
    $.ajax({
      url: epgUrl,
      method: 'GET',
      dataType: 'xml',
      success: function(data) {
        const epgData = $(data).find(`channel[id="${epgId}"]`);
        if (epgData.length) {
          const programs = epgData.find('programme');
          let epgHtml = '<h5>Program Schedule</h5><ul class="list-unstyled">';
          programs.each(function() {
            const start = $(this).attr('start');
            const title = $(this).find('title').text();
            epgHtml += `<li><strong>${start}</strong>: ${title}</li>`;
          });
          epgHtml += '</ul>';
          $('#epg').html(epgHtml);
        } else {
          $('#epg').html('<p>No EPG data available.</p>');
        }
      },
      error: function() {
        $('#epg').html('<p>Failed to load EPG data.</p>');
      }
    });
  }
});
