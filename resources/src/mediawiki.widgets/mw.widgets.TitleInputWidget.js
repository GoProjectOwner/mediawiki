/*!
 * MediaWiki Widgets - TitleInputWidget class.
 *
 * @copyright 2011-2015 MediaWiki Widgets Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */
( function ( $, mw ) {
	/**
	 * Creates an mw.widgets.TitleInputWidget object.
	 *
	 * @class
	 * @extends OO.ui.TextInputWidget
	 * @mixins OO.ui.mixin.LookupElement
	 *
	 * @constructor
	 * @param {Object} [config] Configuration options
	 * @cfg {number} [limit=10] Number of results to show
	 * @cfg {number} [namespace] Namespace to prepend to queries
	 * @cfg {boolean} [showRedirectTargets=true] Show the targets of redirects
	 * @cfg {boolean} [showRedlink] Show red link to exact match if it doesn't exist
	 * @cfg {boolean} [showImages] Show page images
	 * @cfg {boolean} [showDescriptions] Show page descriptions
	 * @cfg {Object} [cache] Result cache which implements a 'set' method, taking keyed values as an argument
	 */
	mw.widgets.TitleInputWidget = function MwWidgetsTitleInputWidget( config ) {
		var widget = this;

		// Config initialization
		config = config || {};

		// Parent constructor
		OO.ui.TextInputWidget.call( this, config );

		// Mixin constructors
		OO.ui.mixin.LookupElement.call( this, config );

		// Properties
		this.limit = config.limit || 10;
		this.namespace = config.namespace || null;
		this.showRedirectTargets = config.showRedirectTargets !== false;
		this.showRedlink = !!config.showRedlink;
		this.showImages = !!config.showImages;
		this.showDescriptions = !!config.showDescriptions;
		this.cache = config.cache;

		// Initialization
		this.$element.addClass( 'mw-widget-titleInputWidget' );
		this.lookupMenu.$element.addClass( 'mw-widget-titleInputWidget-menu' );
		if ( this.showImages ) {
			this.lookupMenu.$element.addClass( 'mw-widget-titleInputWidget-menu-withImages' );
		}
		if ( this.showDescriptions ) {
			this.lookupMenu.$element.addClass( 'mw-widget-titleInputWidget-menu-withDescriptions' );
		}

		this.interwikiPrefixes = [];
		this.interwikiPrefixesPromise = new mw.Api().get( {
			action: 'query',
			meta: 'siteinfo',
			siprop: 'interwikimap'
		} ).done( function ( data ) {
			$.each( data.query.interwikimap, function ( index, interwiki ) {
				widget.interwikiPrefixes.push( interwiki.prefix );
			} );
		} );
	};

	/* Inheritance */

	OO.inheritClass( mw.widgets.TitleInputWidget, OO.ui.TextInputWidget );

	OO.mixinClass( mw.widgets.TitleInputWidget, OO.ui.mixin.LookupElement );

	/* Methods */

	/**
	 * @inheritdoc
	 */
	mw.widgets.TitleInputWidget.prototype.onLookupMenuItemChoose = function ( item ) {
		this.closeLookupMenu();
		this.setLookupsDisabled( true );
		this.setValue( item.getData() );
		this.setLookupsDisabled( false );
	};

	/**
	 * @inheritdoc
	 */
	mw.widgets.TitleInputWidget.prototype.focus = function () {
		var retval;

		// Prevent programmatic focus from opening the menu
		this.setLookupsDisabled( true );

		// Parent method
		retval = OO.ui.TextInputWidget.prototype.focus.apply( this, arguments );

		this.setLookupsDisabled( false );

		return retval;
	};

	/**
	 * @inheritdoc
	 */
	mw.widgets.TitleInputWidget.prototype.getLookupRequest = function () {
		var req,
			widget = this,
			promiseAbortObject = { abort: function () {
				// Do nothing. This is just so OOUI doesn't break due to abort being undefined.
			} };

		if ( mw.Title.newFromText( this.value ) ) {
			return this.interwikiPrefixesPromise.then( function () {
				var params, props,
					interwiki = widget.value.substring( 0, widget.value.indexOf( ':' ) );
				if (
					interwiki && interwiki !== '' &&
					widget.interwikiPrefixes.indexOf( interwiki ) !== -1
				) {
					return $.Deferred().resolve( { query: {
						pages: [{
							title: widget.value
						}]
					} } ).promise( promiseAbortObject );
				} else {
					params = {
						action: 'query',
						generator: 'prefixsearch',
						gpssearch: widget.value,
						gpsnamespace: widget.namespace !== null ? widget.namespace : undefined,
						gpslimit: widget.limit,
						ppprop: 'disambiguation'
					};
					props = [ 'info', 'pageprops' ];
					if ( widget.showRedirectTargets ) {
						params.redirects = '1';
					}
					if ( widget.showImages ) {
						props.push( 'pageimages' );
						params.pithumbsize = 80;
						params.pilimit = widget.limit;
					}
					if ( widget.showDescriptions ) {
						props.push( 'pageterms' );
						params.wbptterms = 'description';
					}
					params.prop = props.join( '|' );
					req = new mw.Api().get( params );
					promiseAbortObject.abort = req.abort.bind( req ); // todo: ew
					return req;
				}
			} ).promise( promiseAbortObject );
		} else {
			// Don't send invalid titles to the API.
			// Just pretend it returned nothing so we can show the 'invalid title' section
			return $.Deferred().resolve( {} ).promise( promiseAbortObject );
		}
	};

	/**
	 * Get lookup cache item from server response data.
	 *
	 * @method
	 * @param {Mixed} data Response from server
	 */
	mw.widgets.TitleInputWidget.prototype.getLookupCacheDataFromResponse = function ( data ) {
		return data.query || {};
	};

	/**
	 * Get list of menu items from a server response.
	 *
	 * @param {Object} data Query result
	 * @returns {OO.ui.MenuOptionWidget[]} Menu items
	 */
	mw.widgets.TitleInputWidget.prototype.getLookupMenuOptionsFromData = function ( data ) {
		var i, len, index, pageExists, pageExistsExact, suggestionPage, page, redirect, redirects,
			items = [],
			titles = [],
			titleObj = mw.Title.newFromText( this.value ),
			redirectsTo = {},
			pageData = {};

		if ( data.redirects ) {
			for ( i = 0, len = data.redirects.length; i < len; i++ ) {
				redirect = data.redirects[i];
				redirectsTo[redirect.to] = redirectsTo[redirect.to] || [];
				redirectsTo[redirect.to].push( redirect.from );
			}
		}

		for ( index in data.pages ) {
			suggestionPage = data.pages[index];
			pageData[suggestionPage.title] = {
				missing: suggestionPage.missing !== undefined,
				redirect: suggestionPage.redirect !== undefined,
				disambiguation: OO.getProp( suggestionPage, 'pageprops', 'disambiguation' ) !== undefined,
				imageUrl: OO.getProp( suggestionPage, 'thumbnail', 'source' ),
				description: OO.getProp( suggestionPage, 'terms', 'description' )
			};
			titles.push( suggestionPage.title );

			redirects = redirectsTo[suggestionPage.title] || [];
			for ( i = 0, len = redirects.length; i < len; i++ ) {
				pageData[redirects[i]] = {
					missing: false,
					redirect: true,
					disambiguation: false,
					description: mw.msg( 'mw-widgets-titleinput-description-redirect', suggestionPage.title )
				};
				titles.push( redirects[i] );
			}
		}

		// If not found, run value through mw.Title to avoid treating a match as a
		// mismatch where normalisation would make them matching (bug 48476)

		pageExistsExact = titles.indexOf( this.value ) !== -1;
		pageExists = pageExistsExact || (
			titleObj && titles.indexOf( titleObj.getPrefixedText() ) !== -1
		);

		if ( !pageExists ) {
			pageData[this.value] = {
				missing: true, redirect: false, disambiguation: false,
				description: mw.msg( 'mw-widgets-titleinput-description-new-page' )
			};
		}

		if ( this.cache ) {
			this.cache.set( pageData );
		}

		// Offer the exact text as a suggestion if the page exists
		if ( pageExists && !pageExistsExact ) {
			titles.unshift( this.value );
		}
		// Offer the exact text as a new page if the title is valid
		if ( this.showRedlink && !pageExists && titleObj ) {
			titles.push( this.value );
		}
		for ( i = 0, len = titles.length; i < len; i++ ) {
			page = pageData[titles[i]] || {};
			items.push( new mw.widgets.TitleOptionWidget( this.getOptionWidgetData( titles[i], page ) ) );
		}

		return items;
	};

	/**
	 * Get menu option widget data from the title and page data
	 *
	 * @param {mw.Title} title Title object
	 * @param {Object} data Page data
	 * @return {Object} Data for option widget
	 */
	mw.widgets.TitleInputWidget.prototype.getOptionWidgetData = function ( title, data ) {
		var mwTitle = new mw.Title( title );
		return {
			data: this.namespace !== null ? mwTitle.getRelativeText( this.namespace ) : title,
			imageUrl: this.showImages ? data.imageUrl : null,
			description: this.showDescriptions ? data.description : null,
			missing: data.missing,
			redirect: data.redirect,
			disambiguation: data.disambiguation,
			query: this.value
		};
	};

	/**
	 * Get title object corresponding to #getValue
	 *
	 * @returns {mw.Title|null} Title object, or null if value is invalid
	 */
	mw.widgets.TitleInputWidget.prototype.getTitle = function () {
		var title = this.getValue(),
			// mw.Title doesn't handle null well
			titleObj = mw.Title.newFromText( title, this.namespace !== null ? this.namespace : undefined );

		return titleObj;
	};

	/**
	 * @inheritdoc
	 */
	mw.widgets.TitleInputWidget.prototype.isValid = function () {
		return $.Deferred().resolve( !!this.getTitle() ).promise();
	};

}( jQuery, mediaWiki ) );
