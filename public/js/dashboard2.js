//   <!-- FUNCTION TO SHOW ADD EXAMPLE, FETCH AND DISPLAY EXAMPLE AND TOASTIFY -->
    // Fetch Example APIs
    function loadExamples() {
      $.get("/api/examples", function (data) {
        let html = "<ul>";
        if (data && data.data && data.data.length > 0) {
          data.data.forEach(function (example) {
            html += `<li><strong>${example.name}:</strong> ${example.value}
                     <br><strong>Description:</strong> ${example.description}
                     <br><strong>Tags:</strong> ${example.tags.join(", ")}</li>`;
          });
          html += "</ul>";
          $("#examples-list").html(html);
        } else {
          $("#examples-list").html("<p>No examples found.</p>");
        }
      }).fail(function () {
        Toastify({
          text: "❌ Failed to load examples.",
          backgroundColor: "red",
          duration: 3000
        }).showToast();
      });
    }

    // Initial load of examples
    loadExamples();

    // Fetch Market Data
    $.get("/api/marketdata", function (data) {
      let html = "<ul>";
      data.data.forEach(function (market) {
        html += `<li><strong>${market.token}:</strong> ${market.price}</li>`;
      });
      html += "</ul>";
      $("#marketdata-list").html(html);
    });

    // Handle form submission
    $("#example-form").submit(function (e) {
      e.preventDefault();

      const name = $("#name").val();
      const value = $("#value").val();
      const description = $("#description").val();
      const tags = $("#tags").val().split(",").map(tag => tag.trim());

      const newExample = { name, value, description, tags };

      $.ajax({
        url: "/api/examples",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(newExample),
        success: function () {
          Toastify({
            text: "✅ Example added successfully!",
            backgroundColor: "green",
            duration: 3000
          }).showToast();
          $("#name").val('');
          $("#value").val('');
          $("#description").val('');
          $("#tags").val('');
          loadExamples(); // reload examples
        },
        error: function () {
          Toastify({
            text: "❌ Failed to add example.",
            backgroundColor: "red",
            duration: 3000
          }).showToast();
        }
      });
    });




//   <!-- FUNCTION FOR SEARCH -->
    $("#search").on("input", function () {
      const searchTerm = $(this).val().toLowerCase();
      $.get("/api/examples", function (data) {
        const filteredExamples = data.data.filter(example => 
          example.name.toLowerCase().includes(searchTerm) || 
          example.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
        displayExamples(filteredExamples);
      });
    });

    function displayExamples(examples) {
      let html = "<ul>";
      if (examples.length > 0) {
        examples.forEach(function (example) {
          html += `<li><strong>${example.name}:</strong> ${example.value}
                   <br><strong>Description:</strong> ${example.description}
                   <br><strong>Tags:</strong> ${example.tags.join(", ")}</li>`;
        });
        html += "</ul>";
        $("#examples-list").html(html);
      } else {
        $("#examples-list").html("<p>No examples found.</p>");
      }
    }









    // FUNTION TO GET TOKEN PRICE FILTER TOKEN ETC 
let latestMarketData = [];

function fetchMarketData() {
  $.get('/api/marketdata', function (data) {
    if (data && data.data && data.data.length > 0) {
      latestMarketData = data.data.map(item => ({
        ...item,
        numericPrice: parseFloat(item.price.replace(' USD', '')),
        token: item.token,
        symbol: item.symbol || "" // ensure symbol exists
      }));
      applyMarketFilter();
    } else {
      $("#marketdata-list").html("<p>No market data found.</p>");
    }
  }).fail(function () {
    Toastify({
      text: "❌ Failed to load market data.",
      backgroundColor: "red",
      duration: 3000
    }).showToast();
  });
}

function renderMarketData(data) {
  if (data.length === 0) {
    $("#marketdata-list").html("<p>No matching tokens found.</p>");
    return;
  }

  let html = "<ul>";
  data.forEach(function (market) {
    html += `<li><strong>${market.token} (${market.symbol.toUpperCase()}):</strong> ${market.price}</li>`;
  });
  html += "</ul>";
  $("#marketdata-list").html(html);
}

function applyMarketFilter() {
  const searchValue = $('#token-search').val().toLowerCase();
  const filter = $('#market-filter').val();

  // Filter by token name or symbol
  let filteredData = latestMarketData.filter(item =>
    item.token.toLowerCase().includes(searchValue) ||
    item.symbol.toLowerCase().includes(searchValue)
  );

  // Apply sorting
switch (filter) {
  case 'highest':
    filteredData.sort((a, b) => b.numericPrice - a.numericPrice);
    break;
  case 'lowest':
    filteredData.sort((a, b) => a.numericPrice - b.numericPrice);
    break;
  case 'az':
    filteredData.sort((a, b) => a.token.localeCompare(b.token));
    break;
  case 'za':
    filteredData.sort((a, b) => b.token.localeCompare(a.token));
    break;
  case 'new':
    filteredData.sort((a, b) => {
      const dateA = new Date(a.addedDate);
      const dateB = new Date(b.addedDate);
      return dateB - dateA; // Newest first
    });
    break;
}


  renderMarketData(filteredData);
}

function autoRefreshMarketData() {
  setInterval(fetchMarketData, 30000); // every 30s
}

$(document).ready(function () {
  fetchMarketData();
  autoRefreshMarketData();
});







