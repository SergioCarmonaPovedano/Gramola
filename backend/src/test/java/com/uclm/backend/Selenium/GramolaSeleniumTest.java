package com.uclm.backend.Selenium;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class GramolaSeleniumTest {

    private WebDriver driver;
    private WebDriverWait wait;

    private static final String FRONT_URL =
            getOptionalEnv("GRAMOLA_FRONT_URL", "http://127.0.0.1:4200");

    private static final String BAR_EMAIL =
            getRequiredEnv("GRAMOLA_TEST_BAR_EMAIL");

    private static final String BAR_PASSWORD =
            getRequiredEnv("GRAMOLA_TEST_BAR_PASSWORD");

    private static final String SONG_QUERY =
            getOptionalEnv("GRAMOLA_TEST_SONG_QUERY", "Wonderwall Oasis");

    private static final String EXPECTED_SONG_TITLE =
            getOptionalEnv("GRAMOLA_TEST_EXPECTED_SONG_TITLE", "Wonderwall");

    private static final String DB_URL =
            getOptionalEnv(
                    "GRAMOLA_DB_URL",
                    "jdbc:mysql://localhost:3306/gramola?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true"
            );

    private static final String DB_USERNAME =
            getRequiredEnv("DB_USERNAME");

    private static final String DB_PASSWORD =
            getRequiredEnv("DB_PASSWORD");

    private static final String CHROME_PROFILE_DIR =
            getOptionalEnv("GRAMOLA_CHROME_PROFILE_DIR", "C:/selenium/gramola-profile");

    private static final long STEP_DELAY_MS = 2500;

    @BeforeEach
    void setUp() {
        ChromeOptions options = new ChromeOptions();

        options.addArguments("--start-maximized");
        options.addArguments("user-data-dir=" + CHROME_PROFILE_DIR);

        driver = new ChromeDriver(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(180));
    }

    @AfterEach
    void tearDown() throws InterruptedException {
        pause();

        if (driver != null) {
            driver.quit();
        }
    }

    @Test
    void clientSearchesPaysAndSongIsStoredInDatabase() throws Exception {
        showStep("1. Comprobamos el estado inicial de la base de datos");

        int transactionsBefore = countConfirmedTrackTransactions();
        int paidTracksBefore = countPaidLibraryTracksByTitle(EXPECTED_SONG_TITLE);

        showStep("2. El bar inicia sesión en La Gramola");
        performLogin();

        showStep("3. El panel entra en modo bar correctamente");
        wait.until(
                ExpectedConditions.visibilityOfElementLocated(
                        By.xpath("//*[contains(text(),'Modo bar')]")
                )
        );

        showStep("4. El bar cambia el dispositivo a modo cliente");
        switchToClientModeIfNeeded();

        showStep("5. El cliente busca una canción mediante la aplicación");
        searchSong(SONG_QUERY);

        showStep("6. El cliente elige la canción y pulsa 'Pagar y colar'");
        WebElement payAndQueueButton = wait.until(
                ExpectedConditions.elementToBeClickable(
                        By.xpath("(//button[contains(text(),'Pagar y colar')])[1]")
                )
        );
        payAndQueueButton.click();

        showStep("7. Se muestra el formulario seguro de pago de Stripe");
        wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.id("card-element"))
        );

        showStep("8. El cliente introduce la tarjeta de prueba de Stripe");
        fillStripeCard();

        showStep("9. El cliente confirma el pago");
        WebElement finalPayButton = wait.until(
                ExpectedConditions.elementToBeClickable(
                        By.xpath("//button[contains(text(),'Pagar') and not(contains(text(),'colar'))]")
                )
        );
        finalPayButton.click();

        showStep("10. La aplicación muestra que el pago se ha confirmado");
        wait.until(
                ExpectedConditions.visibilityOfElementLocated(
                        By.xpath("//*[contains(text(),'Pago confirmado') or contains(text(),'añadida') or contains(text(),'cola')]")
                )
        );

        showStep("11. Comprobamos que Stripe ha quedado confirmado en la base de datos");
        wait.until(driver -> countConfirmedTrackTransactions() > transactionsBefore);

        showStep("12. Comprobamos que la canción pagada se ha guardado en la lista del bar");
        wait.until(driver -> countPaidLibraryTracksByTitle(EXPECTED_SONG_TITLE) > paidTracksBefore);

        int transactionsAfter = countConfirmedTrackTransactions();
        int paidTracksAfter = countPaidLibraryTracksByTitle(EXPECTED_SONG_TITLE);

        assertTrue(
                transactionsAfter > transactionsBefore,
                "Debe existir una nueva transacción Stripe confirmada para el bar."
        );

        assertTrue(
                paidTracksAfter > paidTracksBefore,
                "La canción pagada debe añadirse a la lista del bar en la base de datos."
        );

        showStep("13. Test completado correctamente: el cliente ha buscado, pagado y añadido la canción");
    }

    private void performLogin() throws InterruptedException {
        driver.get(FRONT_URL + "/login");

        WebElement emailInput = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.id("gramolaLoginEmail"))
        );

        Thread.sleep(1200);

        emailInput.click();
        emailInput.sendKeys(Keys.chord(Keys.CONTROL, "a"));
        emailInput.sendKeys(Keys.DELETE);
        emailInput.sendKeys(BAR_EMAIL);

        pause();

        WebElement passwordInput = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.id("gramolaLoginPassword"))
        );

        passwordInput.click();
        passwordInput.sendKeys(Keys.chord(Keys.CONTROL, "a"));
        passwordInput.sendKeys(Keys.DELETE);
        passwordInput.sendKeys(BAR_PASSWORD);

        pause();

        WebElement loginButton = wait.until(
                ExpectedConditions.elementToBeClickable(By.cssSelector("button[type='submit']"))
        );

        loginButton.click();

        wait.until(ExpectedConditions.urlContains("/music"));
        pause();
    }

    private void switchToClientModeIfNeeded() throws InterruptedException {
        boolean alreadyInClientMode = !driver.findElements(
                By.xpath("//*[contains(text(),'Modo cliente')]")
        ).isEmpty();

        if (alreadyInClientMode) {
            return;
        }

        WebElement changeModeButton = wait.until(
                ExpectedConditions.elementToBeClickable(
                        By.xpath("//button[contains(text(),'Cambiar a cliente')]")
                )
        );

        changeModeButton.click();

        wait.until(
                ExpectedConditions.visibilityOfElementLocated(
                        By.xpath("//*[contains(text(),'Modo cliente')]")
                )
        );

        pause();
    }

    private void searchSong(String query) throws InterruptedException {
        WebElement searchInput = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.id("gramolaSongSearch"))
        );

        searchInput.click();
        searchInput.sendKeys(Keys.chord(Keys.CONTROL, "a"));
        searchInput.sendKeys(Keys.DELETE);
        searchInput.sendKeys(query);

        pause();

        WebElement searchButton = wait.until(
                ExpectedConditions.elementToBeClickable(
                        By.xpath("//button[contains(text(),'Buscar')]")
                )
        );

        searchButton.click();

        wait.until(
                ExpectedConditions.visibilityOfElementLocated(
                        By.xpath("//button[contains(text(),'Pagar y colar')]")
                )
        );

        pause();
    }

    private void fillStripeCard() throws InterruptedException {
        wait.until(
                ExpectedConditions.frameToBeAvailableAndSwitchToIt(
                        By.cssSelector("#card-element iframe")
                )
        );

        try {
            List<WebElement> cardNumberInputs = driver.findElements(By.cssSelector("input[name='cardnumber']"));
            List<WebElement> expiryInputs = driver.findElements(By.cssSelector("input[name='exp-date']"));
            List<WebElement> cvcInputs = driver.findElements(By.cssSelector("input[name='cvc']"));

            if (!cardNumberInputs.isEmpty()) {
                cardNumberInputs.get(0).sendKeys("4242424242424242");
                pause();
            }

            if (!expiryInputs.isEmpty()) {
                expiryInputs.get(0).sendKeys("1234");
                pause();
            }

            if (!cvcInputs.isEmpty()) {
                cvcInputs.get(0).sendKeys("123");
                pause();
            }

            if (cardNumberInputs.isEmpty()) {
                WebElement genericInput = wait.until(
                        ExpectedConditions.visibilityOfElementLocated(By.cssSelector("input"))
                );

                genericInput.sendKeys("4242424242424242");
                pause();

                genericInput.sendKeys("1234");
                pause();

                genericInput.sendKeys("123");
                pause();
            }

        } finally {
            driver.switchTo().defaultContent();
        }

        pause();
    }

    private int countConfirmedTrackTransactions() {
        String sql =
                "SELECT COUNT(*) " +
                "FROM stripe_transaction " +
                "WHERE email = ? " +
                "AND data LIKE '%succeeded%'";

        return queryCount(sql, BAR_EMAIL);
    }

    private int countPaidLibraryTracksByTitle(String title) {
        String sql =
                "SELECT COUNT(*) " +
                "FROM track " +
                "WHERE bar_email = ? " +
                "AND LOWER(title) LIKE LOWER(?) " +
                "AND paid = true " +
                "AND library_song = true";

        return queryCount(sql, BAR_EMAIL, "%" + title + "%");
    }

    private int queryCount(String sql, String... params) {
        try (
                Connection connection = DriverManager.getConnection(DB_URL, DB_USERNAME, DB_PASSWORD);
                PreparedStatement statement = connection.prepareStatement(sql)
        ) {
            for (int i = 0; i < params.length; i++) {
                statement.setString(i + 1, params[i]);
            }

            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getInt(1);
                }

                return 0;
            }

        } catch (Exception e) {
            throw new RuntimeException("Error consultando la base de datos desde Selenium: " + e.getMessage(), e);
        }
    }

    private void showStep(String message) throws InterruptedException {
        System.out.println();
        System.out.println("==================================================");
        System.out.println(message);
        System.out.println("==================================================");
        pause();
    }

    private void pause() throws InterruptedException {
        Thread.sleep(STEP_DELAY_MS);
    }

    private static String getRequiredEnv(String name) {
        String value = System.getenv(name);

        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Falta la variable de entorno obligatoria: " + name);
        }

        return value;
    }

    private static String getOptionalEnv(String name, String defaultValue) {
        String value = System.getenv(name);

        if (value == null || value.isBlank()) {
            return defaultValue;
        }

        return value;
    }
}