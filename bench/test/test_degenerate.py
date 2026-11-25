import sys, os, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from run import degenerate, check


class T(unittest.TestCase):
    def test_fluent_swahili_passes(self):
        a = ("Kila mwanachama anachangia shilingi 500 kwa wiki. Wanachama 12 wanachangia 12 x 500 = "
             "shilingi 6,000 kwa wiki. Baada ya wiki 4: 6,000 x 4 = shilingi 24,000.")
        self.assertIsNone(degenerate(a, "swali"))
        self.assertTrue(check(a, {"prompt": "swali", "must_include_any": ["24,000"]}))

    def test_structured_list_not_flagged(self):
        a = "Hatua ya kwanza ni kupanda mapema. Hatua ya pili ni kupalilia mapema. Hatua ya tatu ni kuweka mbolea. Hatua ya nne ni kuvuna."
        self.assertIsNone(degenerate(a, "swali"))

    def test_loop_flagged_even_with_keyword(self):
        a = "Malaria ni mpya wa mpya wa mpya wa mpya wa mpya wa mpya wa mpya chandarua"
        self.assertEqual(degenerate(a, "swali"), "repetition loop")
        self.assertFalse(check(a, {"prompt": "swali", "must_include_any": ["chandarua"]}))

    def test_echo_flagged(self):
        p = "Andika ujumbe mfupi wa kumjulisha mwalimu kuwa mtoto wangu ni mgonjwa"
        self.assertEqual(degenerate("Andika ujumbe mfupi wa kumjulisha mwalimu kuwa mtoto wangu ni mgonjwa. Sawa.", p), "echoes the prompt")


class Lang(unittest.TestCase):
    def test_indonesian_flagged(self):
        a = "Berikut adalah cara menghitung total biaya: Harga satu kilo sukari 160, jumla 480"
        self.assertEqual(degenerate(a, "swali"), "wrong language")

    def test_swahili_with_yang_free(self):
        a = "Mimea hutumia mwanga wa jua, maji na hewa kutengeneza chakula chao."
        self.assertIsNone(degenerate(a, "swali"))


if __name__ == "__main__":
    unittest.main()
