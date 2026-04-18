import feedparser
from datetime import datetime, timedelta
from typing import List, Dict
import re


def get_stock_news(symbol: str) -> List[Dict[str, str]]:
    """
    Fetch news headlines mentioning the stock symbol from RSS feeds.

    Returns list of dicts with:
        - headline: News headline
        - link: URL to article
        - published: Publication datetime
        - source: News source
    """
    # Remove .NS suffix
    symbol = symbol.replace(".NS", "").upper()

    # RSS feeds
    rss_feeds = [
        {
            "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
            "source": "Economic Times"
        },
        {
            "url": "https://www.moneycontrol.com/rss/latestnews.xml",
            "source": "MoneyControl"
        }
    ]

    all_news = []
    cutoff_time = datetime.now() - timedelta(hours=24)

    # Common company name mappings
    company_names = {
        "RELIANCE": ["reliance", "ril"],
        "TCS": ["tcs", "tata consultancy"],
        "HDFCBANK": ["hdfc bank", "hdfcbank", "hdfc"],
        "INFY": ["infosys", "infy"],
        "ICICIBANK": ["icici bank", "icicibank", "icici"],
        "SBIN": ["sbi", "state bank"],
        "AXISBANK": ["axis bank", "axisbank"],
        "WIPRO": ["wipro"],
        "LT": ["larsen & toubro", "l&t", "larsen and toubro"],
        "MARUTI": ["maruti", "maruti suzuki"]
    }

    # Get search terms for this symbol
    search_terms = company_names.get(symbol, [symbol.lower()])
    search_terms.append(symbol.lower())

    for feed_info in rss_feeds:
        try:
            feed = feedparser.parse(feed_info["url"])

            for entry in feed.entries:
                # Parse publication date
                pub_date = None
                if hasattr(entry, 'published_parsed'):
                    pub_date = datetime(*entry.published_parsed[:6])
                elif hasattr(entry, 'updated_parsed'):
                    pub_date = datetime(*entry.updated_parsed[:6])

                # Skip old news
                if pub_date and pub_date < cutoff_time:
                    continue

                # Check if headline mentions the symbol or company name
                headline = entry.title.lower()
                if any(term in headline for term in search_terms):
                    all_news.append({
                        "headline": entry.title,
                        "link": entry.link if hasattr(entry, 'link') else "",
                        "published": pub_date.isoformat() if pub_date else "",
                        "source": feed_info["source"]
                    })

        except Exception as e:
            print(f"Error fetching from {feed_info['source']}: {e}")
            continue

    # Sort by publication date (newest first)
    all_news.sort(key=lambda x: x['published'], reverse=True)

    return all_news


def analyze_news_sentiment(headlines: List[str]) -> int:
    """
    Analyze sentiment of news headlines using unigrams and bigrams.
    Returns score from -10 to +15.
    """
    positive_words = [
        "surge", "jump", "gain", "profit", "growth", "expansion", "rally",
        "bullish", "upgrade", "beat", "outperform", "strong", "robust",
        "positive", "soar", "rise", "high", "record", "best", "win"
    ]

    negative_words = [
        "fall", "drop", "loss", "decline", "cut", "downgrade", "concern",
        "bearish", "weak", "miss", "underperform", "low", "worst", "crash",
        "plunge", "slump", "negative", "risk", "debt", "fraud", "probe", "selloff"
    ]
    
    positive_bigrams = [
        "record profit", "massive gain", "strong growth", "target raised",
        "buy rating", "beats estimate", "revenue jump", "net profit up"
    ]
    
    negative_bigrams = [
        "record loss", "target cut", "downgrades rating", "profit falls",
        "misses estimate", "shares plunge", "heavy selling", "net loss"
    ]

    score = 0

    for headline in headlines:
        headline_lower = headline.lower()

        # Count positive
        pos_count = sum(1 for word in positive_words if word in headline_lower)
        pos_bi_count = sum(1 for bigram in positive_bigrams if bigram in headline_lower)
        score += (pos_count * 2) + (pos_bi_count * 4)

        # Count negative
        neg_count = sum(1 for word in negative_words if word in headline_lower)
        neg_bi_count = sum(1 for bigram in negative_bigrams if bigram in headline_lower)
        score -= (neg_count * 2) + (neg_bi_count * 4)

    # Clamp between -10 and +15
    return max(-10, min(15, score))


if __name__ == "__main__":
    # Test
    news = get_stock_news("RELIANCE")
    print(f"Found {len(news)} news articles for RELIANCE:")
    for item in news[:5]:
        print(f"- {item['headline']} ({item['source']})")

    if news:
        headlines = [item['headline'] for item in news]
        sentiment = analyze_news_sentiment(headlines)
        print(f"\nNews sentiment score: {sentiment}")
