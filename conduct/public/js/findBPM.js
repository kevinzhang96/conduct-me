var findBPM = function(src, callback) {
  var request = new XMLHttpRequest();
  request.open('GET', src, true);
  request.responseType = 'arraybuffer';
  var targetspd = 1;

  request.onload = function() {

    // Create offline context
    var OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var offlineContext = new OfflineContext(1, 2, 44100);

    offlineContext.decodeAudioData(request.response, function(buffer) {

      // Create buffer source
      var source = offlineContext.createBufferSource();
      source.buffer = buffer;

      // Create filter
      var filter = offlineContext.createBiquadFilter();
      filter.type = "lowpass";

      // Pipe the song into the filter, and the filter into the offline context
      source.connect(filter);
      filter.connect(offlineContext.destination);

      // Schedule the song to start playing at time:0
      source.start(0);

      var peaks,
        initialThresold = 0.9,
        thresold = initialThresold,
        minThresold = 0.3,
        minPeaks = 30;

      do {
        peaks = getPeaksAtThreshold(buffer.getChannelData(0), thresold);
        thresold -= 0.05;
      } while (peaks.length < minPeaks && thresold >= minThresold);


      var intervals = countIntervalsBetweenNearbyPeaks(peaks);

      var groups = groupNeighborsByTempo(intervals, buffer.sampleRate);

      callback(groups.sort(function(intA, intB) {
        return intB.count - intA.count;
      }).splice(0, 5));
    });
  };
  request.send();

  function countIntervalsBetweenNearbyPeaks(peaks) {
    var intervalCounts = [];
    peaks.forEach(function(peak, index) {
      for (var i = 0; i < 10; i++) {
        var interval = peaks[index + i] - peak;
        var foundInterval = intervalCounts.some(function(intervalCount) {
          if (intervalCount.interval === interval)
            return intervalCount.count++;
        });
        if (!foundInterval) {
          intervalCounts.push({
            interval: interval,
            count: 1
          });
        }
      }
    });
    return intervalCounts;
  }

  function groupNeighborsByTempo(intervalCounts, sampleRate) {
    var tempoCounts = [];
    intervalCounts.forEach(function(intervalCount, i) {
      if (intervalCount.interval !== 0) {
        // Convert an interval to tempo
        var theoreticalTempo = 60 / (intervalCount.interval / sampleRate);

        // Adjust the tempo to fit within the 90-180 BPM range
        while (theoreticalTempo < 90) theoreticalTempo *= 2;
        while (theoreticalTempo > 180) theoreticalTempo /= 2;

        theoreticalTempo = Math.round(theoreticalTempo);
        var foundTempo = tempoCounts.some(function(tempoCount) {
          if (tempoCount.tempo === theoreticalTempo)
            return tempoCount.count += intervalCount.count;
        });
        if (!foundTempo) {
          tempoCounts.push({
            tempo: theoreticalTempo,
            count: intervalCount.count
          });
        }
      }
    });
    return tempoCounts;
  }

  function getPeaksAtThreshold(data, threshold) {
    var peaksArray = [];
    var length = data.length;
    for (var i = 0; i < length;) {
      if (data[i] > threshold) {
        peaksArray.push(i);
        // Skip forward ~ 1/4s to get past this peak.
        i += 10000;
      }
      i++;
    }
    return peaksArray;
  }
}
