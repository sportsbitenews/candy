$(function(){
    // @TODO: 
    // * Remove 3rd party dependencies (jQuery)
    // * Remove ES6 feats
    // * Allow for configurable fields

    var qs = new URLSearchParams(window.location.search);
    var search = qs.get('q');
    var filters = qs.get('f');
    var searchUrl = window.location.origin + window.location.pathname;
    var searchApi = 'http://localhost:1337/search';
    var esQuery = {
        // or value sort from tools
        // sort: 'popularity',
        skip: Number(qs.get('skip')),
        size: Number(qs.get('size'))
    };
    var resultText;

    // console.log('qs', qs.toString());

    if (filters) {
        try {
            filters = JSON.parse(decodeURIComponent(filters));

            esQuery.f = filters;
        } catch (err) {
            console.log('Error parsing filters', err);
        }
        // console.log('filters', filters);
    }

    if (esQuery.size) {
        document.querySelector('select[name=size]').value = esQuery.size;
    }

    if (!search) {
        resultText = '<em>Showing all products</em>';
    } else {
        esQuery.q = decodeURIComponent(search);
        resultText = `<em>Showing results for <b>${decodeURIComponent(search)}</b></em>`
    }
    // console.log('esQuery', JSON.stringify(esQuery));

    $.ajax({
        url: searchApi,
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify(esQuery)
    }).done(function(results){
        $('#search-results .row').html('');

        if (results.hits.hits.length > 0) {
            $('#search-terms').html(`${resultText}. <b>${results.hits.total} result(s).</b>`);

            // build search results
            results.hits.hits.forEach(function(result){
                var tmp_img = 'http://placeholdit.imgix.net/~text?txtsize=33&txt=Image%20not%20available&w=279&h=279';
                var img = result._source.product.media.length ?
                    result._source.product.media[0].url :
                    tmp_img
                ;
                var name = result._source.product.name;
                var price = result._source.pricing.priceBooks.find(function(d){
                    return d.priceBookRefKey === result._source.pricing.defaults.USD;
                });
                var refKey = result._source.refKey;
                var resultTemplate = `
                    <div class="small-6 medium-4 columns">
                        <div class="list-item" id="${refKey}">
                            <img src="${img}" style="width:auto;height:279px;">
                            <h2 class="list-title ellipsis">${name}</h2>
                            <div>
                                <span>$${price.regular}</span>
                                <!-- <i class="icon fi-heart"></i> -->
                            </div>
                        </div>
                    </div>
                `;
                // console.log(resultTemplate);
                $('#search-results .row').append(resultTemplate);
            });

            // build filters
            Object.keys(results.aggregations).sort().forEach(function(aggs){
                var filterTemplate = `
                    <fieldset id="${aggs}">
                        <legend>${aggs}:</legend>
                `;
                var buckets = results.aggregations[aggs].buckets.sort(function(a, b){
                    if (a.key.toLowerCase() < b.key.toLowerCase()) {
                        return -1;
                    }
                    if (a.key.toLowerCase() > b.key.toLowerCase()) {
                        return 1;
                    }
                    return 0;
                });
                var inFilter = filters && filters.hasOwnProperty(aggs);

                buckets.forEach(function(filter){
                    if (filter.key) {
                        var key = filter.key;

                        var checked = inFilter && filters[aggs].indexOf(key) !== -1 ? 'checked' : '';

                        filterTemplate += `
                            <div class="${aggs}">
                                <input id="${key}-checkbox" type="checkbox" ${checked}>
                                <label for="${key}-checkbox">${camelize(key)} 
                                    <span class="text-muted">(${filter.doc_count})</span>
                                </label>
                            </div>
                        `;
                    }
                });

                filterTemplate += '</fieldset>';

                $('#filters-content').append(filterTemplate);
            });

            // build pagination
            var total = results.hits.total;
            var size = Number(qs.get('size')) || 15;
            var skip = 0;
            var page = 1;
            var qsPage = Number(qs.get('page')) || 0;

            while (total > 0) {
                qs.set('page', page);
                qs.set('skip', skip);

                var isActive = (page === qsPage) || (!qsPage && page === 1);
                var linkUrl = searchUrl + '?' + qs.toString();

                var paginationTemplate = `<a href="${isActive?'#':linkUrl}" ${isActive ? 'class="active"' : ''} >${page}</a>`;

                $('.pagination.text-center').append(paginationTemplate);

                total -= size;
                skip += size;
                page += 1;
            }

            // track changes in filters
            // has to go here since filters appended
            $('input[type=checkbox]').change(function(event){
                var filterName = event.target.parentElement.className;
                var filterValue = event.target.id.replace('-checkbox','');

                if (event.target) {
                    var querystring = new URLSearchParams(window.location.search);
                    var filters;

                    try {
                        filters = JSON.parse(decodeURIComponent(querystring.get('f'))) || {};
                    } catch (err) {
                        console.log('Error parsing filters', err);
                        return;
                    }

                    // if there are any active filters
                    if (Object.keys(filters).length) {
                        var isPresent = filters.hasOwnProperty(filterName);
                        
                        if (isPresent) {
                            // add or remove based on status of checkbox
                            if (event.target.checked) {
                                // add only if not present; don't duplicate
                                if (filters[filterName].indexOf(filterValue) === -1) {
                                    filters[filterName].push(filterValue);
                                }
                            } else {
                                // remove from active filterName
                                var filtered = filters[filterName].filter(function(val){
                                    return val !== filterValue
                                });

                                // if after remove filterName array is 
                                // empty, then delete filterName
                                if (filtered.length === 0) {
                                    delete filters[filterName];
                                } else {
                                    filters[filterName] = filtered;
                                }
                            }
                        } else {
                            // not present, add new filterName
                            filters[filterName] = [filterValue];
                        }
                    } else {
                        // add new filterName
                        filters[filterName] = [filterValue];
                    }

                    if (Object.keys(filters).length) {
                        querystring.set('f', JSON.stringify(filters));
                        window.location = searchUrl + '?' + querystring.toString();
                    } else {
                        // remove f form qs since it's empty
                        querystring.delete('f');
                        window.location = searchUrl + '?' + querystring.toString();
                    }
                }
                // console.log(`${filterName} -> ${filterValue} got ${event.target.checked?'checked':'unchecked'}`);
            });
        } else {
            $('#search-terms').html(`<em>No results for <b>${decodeURIComponent(search)}</b></em>`);
        }
    });

    $('#search-bar').keydown(function(e){
        var searchTerm = $('#search-bar>input').val();

        if (e.keyCode == 13 && searchTerm !== '') {
            var querystring = new URLSearchParams(window.location.search);

            querystring.set('q', searchTerm);
            window.location = searchUrl + '?' + querystring.toString();
        }
    });

    $('select[name=size]').change(function(event){
        var querystring = new URLSearchParams(window.location.search);

        querystring.set('size', event.target.value);
        querystring.delete('page');
        querystring.delete('skip');
        window.location = searchUrl + '?' + querystring.toString();
    });

	function camelize(str){
	  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter){
		return letter.toUpperCase();
	  });
	}
});

