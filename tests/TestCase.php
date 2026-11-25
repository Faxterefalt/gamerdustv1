<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Ningún test puede llamar a Groq (ni a otro servicio) de verdad: usar Http::fake().
        Http::preventStrayRequests();
    }
}
