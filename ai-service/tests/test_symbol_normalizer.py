import pytest
from app.services.market_data.symbol_normalizer import SymbolNormalizer


def test_symbol_normalization_to_canonical():
    assert SymbolNormalizer.to_canonical("RELIANCE") == "RELIANCE.NS"
    assert SymbolNormalizer.to_canonical("reliance") == "RELIANCE.NS"
    assert SymbolNormalizer.to_canonical("RELIANCE.NS") == "RELIANCE.NS"
    assert SymbolNormalizer.to_canonical("NSE:TCS") == "TCS.NS"
    assert SymbolNormalizer.to_canonical("INFY-EQ") == "INFY.NS"
    assert SymbolNormalizer.to_canonical("HDFCBANK.BO") == "HDFCBANK.NS"


def test_index_normalization():
    assert SymbolNormalizer.to_canonical("NIFTY") == "^NSEI"
    assert SymbolNormalizer.to_canonical("NIFTY 50") == "^NSEI"
    assert SymbolNormalizer.to_canonical("SENSEX") == "^BSESN"
    assert SymbolNormalizer.to_canonical("BANKNIFTY") == "^NSEBANK"
    assert SymbolNormalizer.to_canonical("^NSEI") == "^NSEI"


def test_base_symbol_extraction():
    assert SymbolNormalizer.to_base_symbol("RELIANCE.NS") == "RELIANCE"
    assert SymbolNormalizer.to_base_symbol("^NSEI") == "NIFTY 50"
    assert SymbolNormalizer.to_base_symbol("^BSESN") == "SENSEX"
    assert SymbolNormalizer.to_base_symbol("^NSEBANK") == "BANK NIFTY"
    assert SymbolNormalizer.to_base_symbol("TCS") == "TCS"
