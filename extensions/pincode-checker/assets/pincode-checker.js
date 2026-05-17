(function () {
  document.querySelectorAll('.pdc-widget').forEach(function (widget) {
    if (widget.dataset.pdcInit) return;
    widget.dataset.pdcInit = '1';

    var input = widget.querySelector('.pdc-input');
    var button = widget.querySelector('.pdc-button');
    var btnText = widget.querySelector('.pdc-button-text');
    var btnLoader = widget.querySelector('.pdc-button-loading');
    var result = widget.querySelector('.pdc-result');
    var digitBoxes = widget.querySelectorAll('.pdc-digit-box');
    var progressTrack = widget.querySelector('.pdc-progress-track');
    var progressBar = widget.querySelector('.pdc-progress-bar');

    if (!input || !button || !result) return;

    var apiUrl = widget.dataset.apiUrl || '';
    var shop = widget.dataset.shop || '';
    var productId = widget.dataset.productId || '';
    var showCod = widget.dataset.showCod !== 'false';
    var showCity = widget.dataset.showCity !== 'false';
    var variant = widget.dataset.variant || 'minimal';

    function updateDigits(val) {
      if (!digitBoxes.length) return;
      for (var i = 0; i < 6; i++) {
        var d = val[i] || '';
        digitBoxes[i].textContent = d || '\u2013';
        digitBoxes[i].classList.toggle('pdc-digit--filled', !!d);
      }
    }

    function buildResultHTML(data) {
      if (data.found && data.deliveryType !== 'unavailable') {
        var icon = data.deliveryType === 'express' ? '\u26A1' : '\uD83D\uDE9A';
        var color = data.deliveryType === 'express' ? '#16a34a' : '#ca8a04';
        var html = '';
        if (variant === 'pill' || variant === 'premium') {
          var iconClass = 'pdc-result-icon pdc-result-icon--ok';
          html += '<span class="' + iconClass + '">' + icon + '</span><div>';
        }
        if (showCity) html += '<p class="pdc-city">' + data.city + ', ' + data.state + '</p>';
        
        var dateText = data.exactDatesText 
          ? 'Arrives by ' + data.exactDatesText 
          : (data.label || (data.deliveryType === 'express' ? 'Express' : 'Standard') + ' Delivery') + ' in ' + data.deliveryDays + ' Days';
          
        html += '<p class="pdc-delivery-label" style="color:' + color + '">' + icon + ' ' + dateText + '</p>';
        
        if (data.cutOffTimestamp) {
           html += '<div class="pdc-timer" data-timestamp="' + data.cutOffTimestamp + '"><svg class="pdc-timer-tick" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span class="pdc-timer-text">Order within <span class="pdc-timer-digits">...</span> for dispatch today</span></div>';
        }
        if (showCod && data.codAvailable) html += '<p class="pdc-cod">\u2713 Cash on Delivery available</p>';
        if (variant === 'pill' || variant === 'premium') html += '</div>';
        return { html: html, found: true };
      } else {
        var msg = data.message || 'Delivery not available for this pincode';
        var errHtml = '';
        if (variant === 'pill' || variant === 'premium') {
          errHtml += '<span class="pdc-result-icon pdc-result-icon--fail">\u274C</span><div>';
        }
        errHtml += '<p class="pdc-error">\u2717 ' + msg + '</p>';
        if (variant === 'pill' || variant === 'premium') errHtml += '</div>';
        return { html: errHtml, found: false };
      }
    }

    var countdownInterval = null;
    function startCountdown() {
      if (countdownInterval) clearInterval(countdownInterval);
      var timerEl = widget.querySelector('.pdc-timer');
      if (!timerEl) return;
      var timestamp = parseInt(timerEl.getAttribute('data-timestamp'), 10);
      var digitsEl = timerEl.querySelector('.pdc-timer-digits');
      if (!timestamp || !digitsEl) return;

      function update() {
        var now = Date.now();
        var diff = Math.max(0, timestamp - now);
        if (diff <= 0) {
          timerEl.style.display = 'none';
          clearInterval(countdownInterval);
          return;
        }
        var h = Math.floor(diff / 3600000);
        var m = Math.floor((diff % 3600000) / 60000);
        var s = Math.floor((diff % 60000) / 1000);
        var text = '';
        if (h > 0) text += h + 'h ';
        text += m + 'm ' + s + 's';
        digitsEl.textContent = text;
      }
      
      update();
      countdownInterval = setInterval(update, 1000);
    }

    function checkPincode(pin) {
      if (!apiUrl || apiUrl.indexOf('example.com') !== -1) {
        result.style.display = 'block';
        result.className = 'pdc-result pdc-not-found';
        result.innerHTML = '<p class="pdc-error">Please configure the App API URL in Theme Editor.</p>';
        return;
      }

      button.disabled = true;
      if (btnText) btnText.style.display = 'none';
      if (btnLoader) btnLoader.style.display = 'flex';
      result.style.display = 'none';

      var progress = 0;
      var progressTimer = null;
      if (progressTrack && progressBar) {
        progressTrack.style.display = '';
        progressBar.style.width = '0%';
        progressTimer = setInterval(function () {
          progress += Math.random() * 15;
          if (progress >= 85) { clearInterval(progressTimer); progress = 85; }
          progressBar.style.width = Math.min(progress, 85) + '%';
        }, 100);
      }

      var url = apiUrl.replace(/\/$/, '') + '/api/check-pincode?pincode=' + pin + '&shop=' + shop + '&product_id=' + productId;

      fetch(url, { method: 'GET' })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (progressTimer) clearInterval(progressTimer);
          if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.style.background = data.found && data.deliveryType !== 'unavailable' ? '#22c55e' : '#ef4444';
          }

          try { localStorage.setItem('pdc_saved_pincode', pin); } catch (e) { }

          setTimeout(function () {
            var r = buildResultHTML(data);
            result.style.display = 'block';
            result.className = 'pdc-result ' + (r.found ? 'pdc-found' : 'pdc-not-found');
            result.innerHTML = r.html;
            if (r.found) startCountdown();
          }, progressBar ? 300 : 0);
        })
        .catch(function () {
          if (progressTimer) clearInterval(progressTimer);
          result.style.display = 'block';
          result.className = 'pdc-result pdc-not-found';
          result.innerHTML = '<p class="pdc-error">Unable to check delivery. Please try again.</p>';
        })
        .finally(function () {
          button.disabled = input.value.length !== 6;
          if (btnText) btnText.style.display = '';
          if (btnLoader) btnLoader.style.display = 'none';
        });
    }

    input.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '');
      button.disabled = this.value.length !== 6;
      result.style.display = 'none';
      if (progressTrack) progressTrack.style.display = 'none';
      updateDigits(this.value);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && this.value.length === 6) checkPincode(this.value);
    });

    button.addEventListener('click', function () {
      if (input.value.length === 6) checkPincode(input.value);
    });

    // Initialization & Geolocation Auto-detect
    try {
      var savedPin = localStorage.getItem('pdc_saved_pincode');
      if (savedPin && /^\d{6}$/.test(savedPin)) {
        input.value = savedPin;
        updateDigits(savedPin);
        checkPincode(savedPin);
      } else if (!localStorage.getItem('pdc_geo_checked')) {
        localStorage.setItem('pdc_geo_checked', '1');

        var fallbackToIP = function () {
          fetch('https://get.geojs.io/v1/ip/geo.json')
            .then(function (res) { return res.json(); })
            .then(function (geo) {
              if (geo && geo.postal && /^\d{6}$/.test(geo.postal)) {
                input.value = geo.postal;
                updateDigits(geo.postal);
                checkPincode(geo.postal);
              }
            })
            .catch(function () { });
        };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            function (pos) {
              var lat = pos.coords.latitude;
              var lon = pos.coords.longitude;
              fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lon)
                .then(function (res) { return res.json(); })
                .then(function (data) {
                  var pcode = (data.address && data.address.postcode) ? data.address.postcode.replace(/\D/g, '') : '';
                  if (pcode && /^\d{6}$/.test(pcode)) {
                    input.value = pcode;
                    updateDigits(pcode);
                    checkPincode(pcode);
                  } else {
                    fallbackToIP();
                  }
                })
                .catch(fallbackToIP);
            },
            function (err) {
              fallbackToIP(); // User denied or timeout
            },
            { timeout: 5000 }
          );
        } else {
          fallbackToIP();
        }
      }
    } catch (e) { }
  });
})();
