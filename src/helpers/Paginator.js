import _ from 'lodash';

class Paginator {
    construnctor(items, options) {
        this.items = items;
        this.options =_.merge(this.getDefaultOptions(), options);
        this.pages = _.chunk(this.items, options.pageSize);
    }
    
    get totalCount() {
        return this.items.length;
    }

    get pagesCount() {
        return this.pages.length;
    }

    getDefaultOptions() {
        return {
            pageSize: 20,
        }
    }

    getPage(number = 1) {
        if (number === 'last') {
            number = this.pages.length;
        }
        return {
            total: this.totalCount,
            pagesCount,
            page: number,
            items: this.pages[number - 1]
        }
    }
};

export default Paginator;