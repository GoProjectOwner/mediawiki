/*!
 * MediaWiki Widgets - TitleOptionWidget class.
 *
 * @copyright 2011-2015 MediaWiki Widgets Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */
( function ( $, mw ) {

	/**
	 * Creates a mw.widgets.TitleOptionWidget object.
	 *
	 * @class
	 * @extends OO.ui.MenuOptionWidget
	 *
	 * @constructor
	 * @param {Object} [config] Configuration options
	 * @cfg {string} [data] Page title
	 * @cfg {string} [imageUrl] Thumbnail image URL with URL encoding
	 * @cfg {string} [description] Page description
	 * @cfg {boolean} [missing] Page doesn't exist
	 * @cfg {boolean} [redirect] Page is a redirect
	 * @cfg {boolean} [disambiguation] Page is a disambiguation page
	 * @cfg {string} [query] Matching query string
	 */
	mw.widgets.TitleOptionWidget = function MwWidgetsTitleOptionWidget( config ) {
		var icon, title = config.data;

		if ( config.missing ) {
			icon = 'page-not-found';
		} else if ( config.redirect ) {
			icon = 'page-redirect';
		} else if ( config.disambiguation ) {
			icon = 'page-disambiguation';
		} else {
			icon = 'page-existing';
		}

		// Config initialization
		config = $.extend( {
			icon: icon,
			label: title,
			href: mw.util.getUrl( title ),
			autoFitLabel: false
		}, config );

		// Parent constructor
		OO.ui.MenuOptionWidget.call( this, config );

		// Intialization
		this.$label.wrap( '<a>' );
		this.$link = this.$label.parent();
		this.$link.attr( 'href', config.href );
		this.$element.addClass( 'mw-widget-titleOptionWidget' );

		// Highlight matching parts of link suggestion
		this.$label.autoEllipsis( { hasSpan: false, tooltip: true, matchText: config.query } );

		if ( config.missing ) {
			this.$link.addClass( 'new' );
		}

		if ( config.imageUrl ) {
			this.$icon
				.addClass( 'mw-widget-titleOptionWidget-hasImage' )
				.css( 'background-image', 'url(' + config.imageUrl + ')' );
		}

		if ( config.description ) {
			this.$element.append(
				$( '<span>' )
					.addClass( 'mw-widget-titleOptionWidget-description' )
					.text( config.description )
			);
		}
	};

	/* Inheritance */

	OO.inheritClass( mw.widgets.TitleOptionWidget, OO.ui.MenuOptionWidget );

}( jQuery, mediaWiki ) );
