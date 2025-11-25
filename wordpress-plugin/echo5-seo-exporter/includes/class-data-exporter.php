<?php
/**
 * Data Exporter - Extracts and formats SEO data from WordPress
 */

class Echo5_SEO_Data_Exporter {
    
    /**
     * Get pages with full SEO data
     */
    public function get_pages($per_page = 20, $page = 1, $fields = 'all') {
        // Check cache first
        $cache_key = "echo5_pages_{$per_page}_{$page}_{$fields}";
        $cached = get_transient($cache_key);
        
        if ($cached && get_option('echo5_seo_enable_caching') === '1') {
            return $cached;
        }
        
        $offset = ($page - 1) * $per_page;
        
        $args = array(
            'post_type' => 'page',
            'post_status' => 'publish',
            'posts_per_page' => $per_page,
            'offset' => $offset,
            'orderby' => 'menu_order',
            'order' => 'ASC',
        );
        
        $query = new WP_Query($args);
        $total = $query->found_posts;
        $items = array();
        
        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $items[] = $this->format_page_data(get_post(), $fields);
            }
            wp_reset_postdata();
        }
        
        $result = array(
            'items' => $items,
            'total' => $total,
            'total_pages' => ceil($total / $per_page),
        );
        
        // Cache for 5 minutes
        set_transient($cache_key, $result, 300);
        
        return $result;
    }
    
    /**
     * Get single page with full SEO data
     */
    public function get_single_page($id) {
        $post = get_post($id);
        
        if (!$post || $post->post_type !== 'page') {
            return null;
        }
        
        return $this->format_page_data($post, 'all');
    }
    
    /**
     * Get posts with full SEO data
     */
    public function get_posts($per_page = 20, $page = 1) {
        $offset = ($page - 1) * $per_page;
        
        $args = array(
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => $per_page,
            'offset' => $offset,
            'orderby' => 'date',
            'order' => 'DESC',
        );
        
        $query = new WP_Query($args);
        $total = $query->found_posts;
        $items = array();
        
        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $items[] = $this->format_page_data(get_post(), 'all');
            }
            wp_reset_postdata();
        }
        
        return array(
            'items' => $items,
            'total' => $total,
            'total_pages' => ceil($total / $per_page),
        );
    }
    
    /**
     * Get all content (pages + posts)
     */
    public function get_all_content($per_page = 50, $page = 1, $include_content = true) {
        $offset = ($page - 1) * $per_page;
        
        $args = array(
            'post_type' => array('page', 'post'),
            'post_status' => 'publish',
            'posts_per_page' => $per_page,
            'offset' => $offset,
            'orderby' => 'modified',
            'order' => 'DESC',
        );
        
        $query = new WP_Query($args);
        $total = $query->found_posts;
        $items = array();
        
        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $fields = $include_content ? 'all' : 'minimal';
                $items[] = $this->format_page_data(get_post(), $fields);
            }
            wp_reset_postdata();
        }
        
        return array(
            'items' => $items,
            'total' => $total,
            'total_pages' => ceil($total / $per_page),
        );
    }
    
    /**
     * Format page/post data with comprehensive SEO information
     */
    private function format_page_data($post, $fields = 'all') {
        $url = get_permalink($post->ID);
        $parsed_url = parse_url($url);
        $path = $parsed_url['path'] ?? '/';
        $slug = ($path === '/' || $path === '') ? '__root__' : ltrim($path, '/');
        
        // Base data (always included)
        $data = array(
            'id' => $post->ID,
            'type' => $post->post_type,
            'url' => $url,
            'slug' => $slug,
            'path' => $path,
            'title' => get_the_title($post->ID),
            'status' => $post->post_status,
            'published_date' => $post->post_date,
            'modified_date' => $post->post_modified,
        );
        
        // Return minimal data if requested
        if ($fields === 'minimal') {
            return $data;
        }
        
        // Full content and SEO data
        $content = apply_filters('the_content', $post->post_content);
        $content_text = wp_strip_all_tags($content);
        $word_count = str_word_count($content_text);
        
        // Extract headings from content
        $headings = $this->extract_headings($content);
        
        // Extract images
        $images = $this->extract_images($content, $post->ID);
        
        // Extract links
        $links = $this->extract_links($content, $url);
        
        // Get SEO plugin data (Yoast, RankMath, etc.)
        $seo_data = $this->get_post_seo_data($post->ID);
        
        // Get featured image
        $featured_image = get_the_post_thumbnail_url($post->ID, 'full');
        
        // Get excerpt
        $excerpt = has_excerpt($post->ID) ? get_the_excerpt($post->ID) : wp_trim_words($content_text, 30);
        
        // Categories and tags (for posts)
        $categories = array();
        $tags = array();
        if ($post->post_type === 'post') {
            $post_categories = get_the_category($post->ID);
            foreach ($post_categories as $cat) {
                $categories[] = array(
                    'id' => $cat->term_id,
                    'name' => $cat->name,
                    'slug' => $cat->slug,
                );
            }
            
            $post_tags = get_the_tags($post->ID);
            if ($post_tags) {
                foreach ($post_tags as $tag) {
                    $tags[] = array(
                        'id' => $tag->term_id,
                        'name' => $tag->name,
                        'slug' => $tag->slug,
                    );
                }
            }
        }
        
        // Build comprehensive data
        $data = array_merge($data, array(
            'content' => array(
                'html' => $content,
                'text' => $content_text,
                'excerpt' => $excerpt,
                'word_count' => $word_count,
                'reading_time' => ceil($word_count / 200),
                'has_blocks' => has_blocks($post->post_content),
            ),
            'seo' => array(
                'meta_title' => $seo_data['title'] ?: get_the_title($post->ID),
                'meta_description' => $seo_data['description'] ?: $excerpt,
                'focus_keyword' => $seo_data['focus_keyword'],
                'canonical_url' => $seo_data['canonical'] ?: $url,
                'robots' => $seo_data['robots'],
                'og_title' => $seo_data['og_title'],
                'og_description' => $seo_data['og_description'],
                'og_image' => $seo_data['og_image'] ?: $featured_image,
                'twitter_title' => $seo_data['twitter_title'],
                'twitter_description' => $seo_data['twitter_description'],
                'twitter_image' => $seo_data['twitter_image'] ?: $featured_image,
                'schema' => $seo_data['schema'],
            ),
            'headings' => $headings,
            'images' => $images,
            'links' => $links,
            'featured_image' => $featured_image,
            'author' => array(
                'id' => $post->post_author,
                'name' => get_the_author_meta('display_name', $post->post_author),
                'email' => get_the_author_meta('email', $post->post_author),
            ),
            'categories' => $categories,
            'tags' => $tags,
            'template' => get_page_template_slug($post->ID),
        ));
        
        return $data;
    }
    
    /**
     * Extract headings from content
     */
    private function extract_headings($content) {
        $headings = array(
            'h1' => array(),
            'h2' => array(),
            'h3' => array(),
            'h4' => array(),
            'h5' => array(),
            'h6' => array(),
        );
        
        for ($i = 1; $i <= 6; $i++) {
            preg_match_all("/<h{$i}[^>]*>(.*?)<\/h{$i}>/is", $content, $matches);
            if (!empty($matches[1])) {
                $headings["h{$i}"] = array_map('wp_strip_all_tags', $matches[1]);
            }
        }
        
        return $headings;
    }
    
    /**
     * Extract images from content
     */
    private function extract_images($content, $post_id) {
        $images = array();
        
        preg_match_all('/<img[^>]+>/i', $content, $img_tags);
        
        foreach ($img_tags[0] as $img_tag) {
            preg_match('/src="([^"]+)"/i', $img_tag, $src);
            preg_match('/alt="([^"]*)"/i', $img_tag, $alt);
            preg_match('/width="([^"]+)"/i', $img_tag, $width);
            preg_match('/height="([^"]+)"/i', $img_tag, $height);
            preg_match('/loading="([^"]+)"/i', $img_tag, $loading);
            
            $images[] = array(
                'src' => $src[1] ?? '',
                'alt' => $alt[1] ?? '',
                'width' => $width[1] ?? '',
                'height' => $height[1] ?? '',
                'loading' => $loading[1] ?? '',
                'has_alt' => !empty($alt[1]),
                'has_lazy_loading' => isset($loading[1]) && $loading[1] === 'lazy',
            );
        }
        
        return $images;
    }
    
    /**
     * Extract internal and external links
     */
    private function extract_links($content, $base_url) {
        $internal = array();
        $external = array();
        
        preg_match_all('/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/is', $content, $matches, PREG_SET_ORDER);
        
        $site_url = get_site_url();
        $site_host = parse_url($site_url, PHP_URL_HOST);
        
        foreach ($matches as $match) {
            $href = $match[1];
            $text = wp_strip_all_tags($match[2]);
            
            // Skip anchors and javascript
            if (strpos($href, '#') === 0 || strpos($href, 'javascript:') === 0) {
                continue;
            }
            
            $link_host = parse_url($href, PHP_URL_HOST);
            
            $link_data = array(
                'url' => $href,
                'text' => $text,
            );
            
            if (!$link_host || $link_host === $site_host) {
                $internal[] = $link_data;
            } else {
                $external[] = $link_data;
            }
        }
        
        return array(
            'internal' => $internal,
            'external' => $external,
            'internal_count' => count($internal),
            'external_count' => count($external),
        );
    }
    
    /**
     * Get SEO data from popular SEO plugins (Yoast, RankMath, etc.)
     */
    private function get_post_seo_data($post_id) {
        $seo_data = array(
            'title' => '',
            'description' => '',
            'focus_keyword' => '',
            'canonical' => '',
            'robots' => 'index, follow',
            'og_title' => '',
            'og_description' => '',
            'og_image' => '',
            'twitter_title' => '',
            'twitter_description' => '',
            'twitter_image' => '',
            'schema' => array(),
        );
        
        // Yoast SEO
        if (defined('WPSEO_VERSION')) {
            $seo_data['title'] = get_post_meta($post_id, '_yoast_wpseo_title', true);
            $seo_data['description'] = get_post_meta($post_id, '_yoast_wpseo_metadesc', true);
            $seo_data['focus_keyword'] = get_post_meta($post_id, '_yoast_wpseo_focuskw', true);
            $seo_data['canonical'] = get_post_meta($post_id, '_yoast_wpseo_canonical', true);
            $seo_data['og_title'] = get_post_meta($post_id, '_yoast_wpseo_opengraph-title', true);
            $seo_data['og_description'] = get_post_meta($post_id, '_yoast_wpseo_opengraph-description', true);
            $seo_data['og_image'] = get_post_meta($post_id, '_yoast_wpseo_opengraph-image', true);
            $seo_data['twitter_title'] = get_post_meta($post_id, '_yoast_wpseo_twitter-title', true);
            $seo_data['twitter_description'] = get_post_meta($post_id, '_yoast_wpseo_twitter-description', true);
            $seo_data['twitter_image'] = get_post_meta($post_id, '_yoast_wpseo_twitter-image', true);
        }
        
        // RankMath
        if (defined('RANK_MATH_VERSION')) {
            $seo_data['title'] = get_post_meta($post_id, 'rank_math_title', true);
            $seo_data['description'] = get_post_meta($post_id, 'rank_math_description', true);
            $seo_data['focus_keyword'] = get_post_meta($post_id, 'rank_math_focus_keyword', true);
            $seo_data['canonical'] = get_post_meta($post_id, 'rank_math_canonical_url', true);
            $seo_data['robots'] = get_post_meta($post_id, 'rank_math_robots', true);
        }
        
        // All in One SEO
        if (defined('AIOSEO_VERSION')) {
            $seo_data['title'] = get_post_meta($post_id, '_aioseo_title', true);
            $seo_data['description'] = get_post_meta($post_id, '_aioseo_description', true);
            $seo_data['canonical'] = get_post_meta($post_id, '_aioseo_canonical_url', true);
        }
        
        return $seo_data;
    }
    
    /**
     * Get site structure (menu hierarchy)
     */
    public function get_site_structure() {
        $menus = wp_get_nav_menus();
        $structure = array();
        
        foreach ($menus as $menu) {
            $menu_items = wp_get_nav_menu_items($menu->term_id);
            $structure[$menu->name] = array();
            
            if ($menu_items) {
                foreach ($menu_items as $item) {
                    $structure[$menu->name][] = array(
                        'id' => $item->ID,
                        'title' => $item->title,
                        'url' => $item->url,
                        'parent_id' => $item->menu_item_parent,
                        'order' => $item->menu_order,
                    );
                }
            }
        }
        
        return $structure;
    }
    
    /**
     * Get internal links map
     */
    public function get_internal_links_map() {
        // This would build a graph of internal links
        // Simplified version for now
        $pages = $this->get_all_content(100, 1, false);
        
        return array(
            'total_pages' => count($pages['items']),
            'note' => 'Full internal linking graph requires additional processing',
        );
    }
    
    /**
     * Get SEO plugin information
     */
    public function get_seo_plugin_info() {
        $plugins = array(
            'yoast' => defined('WPSEO_VERSION') ? WPSEO_VERSION : false,
            'rankmath' => defined('RANK_MATH_VERSION') ? RANK_MATH_VERSION : false,
            'aioseo' => defined('AIOSEO_VERSION') ? AIOSEO_VERSION : false,
        );
        
        return array(
            'active_plugins' => array_filter($plugins),
            'wordpress_version' => get_bloginfo('version'),
            'php_version' => PHP_VERSION,
        );
    }
}
