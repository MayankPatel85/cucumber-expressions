package io.cucumber.cucumberexpressions;

import org.junit.Test;

import java.util.Currency;
import java.util.Date;
import java.util.Locale;

import static org.junit.Assert.assertEquals;

public class CucumberExpressionGeneratorTest {

    private final TransformLookup transformLookup = new TransformLookup(Locale.ENGLISH);
    private final CucumberExpressionGenerator generator = new CucumberExpressionGenerator(transformLookup);

    @Test
    public void generates_expression_for_no_args() {
        assertTypedExpression("hello", "hello");
    }

    @Test
    public void generates_expression_for_int_double_arg() {
        assertTypedExpression(
                "I have {arg1:int} cukes and {arg2:double} euro",
                "I have 2 cukes and 1.5 euro");
    }

    @Test
    public void generates_expression_for_just_int() {
        assertTypedExpression(
                "{arg1:int}",
                "99999");
    }

    @Test
    public void generates_expression_without_expression_type() {
        assertUntypedExpression(
                "I have {arg1} cukes and {arg2} euro",
                "I have 2 cukes and 1.5 euro");
    }

    @Test
    public void generates_expression_for_custom_type() {
        transformLookup.addTransform(new SimpleTransform<>(
                "currency",
                Currency.class,
                "[A-Z]{3}",
                null
        ));
        assertTypedExpression(
                "I have a {arg1:currency} account",
                "I have a EUR account");
    }

    @Test
    public void prefers_leftmost_match_when_there_is_overlap() {
        transformLookup.addTransform(new SimpleTransform<>(
                "currency",
                Currency.class,
                "cd",
                null
        ));
        transformLookup.addTransform(new SimpleTransform<>(
                "date",
                Date.class,
                "bc",
                null
        ));
        assertTypedExpression(
                "a{arg1:date}defg",
                "abcdefg");
    }

    @Test
    public void prefers_widest_match_when_pos_is_same() {
        transformLookup.addTransform(new SimpleTransform<>(
                "currency",
                Currency.class,
                "cd",
                null
        ));
        transformLookup.addTransform(new SimpleTransform<>(
                "date",
                Date.class,
                "cde",
                null
        ));
        assertTypedExpression(
                "ab{arg1:date}fg",
                "abcdefg");
    }

    private void assertTypedExpression(String expected, String text) {
        assertEquals(expected, generator.generateExpression(text, true));
    }

    private void assertUntypedExpression(String expected, String text) {
        assertEquals(expected, generator.generateExpression(text, false));
    }
}
